import {
  ANNOTATION_LOCATION,
  ANNOTATION_ORIGIN_LOCATION,
  Entity,
} from '@backstage/catalog-model';
import {
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import axios, { AxiosResponse } from 'axios';
import { Config } from '@backstage/config';
import { kebabCase } from 'lodash';

interface Pagination {
  next: number;
  previous: number;
  count: number;
  current: number;
  total_pages: number;
  start_index: number;
  end_index: number;
}

interface Group {
  pk: string;
  name: string;
  is_superuser: boolean;
  parent_name: string | undefined;
  users: number[];
  users_obj: User[];
  attributes: Record<string, any>;
}

interface User {
  pk: number;
  username: string;
  name: string;
  email: string;
  avatar: string;
}

interface UserResponse {
  pagination: Pagination;
  results: User[];
}

interface GroupResponse {
  pagination: Pagination;
  results: Group[];
}

export class AuthentikUserProvider implements EntityProvider {
  private readonly url: string;
  protected readonly apiToken: string;
  protected connection?: EntityProviderConnection;

  static fromConfig(config: Config, options: {}) {
    const url = config.getString('authentik.url');
    const apiToken = config.getString('authentik.token');
    return new AuthentikUserProvider({
      ...options,
      url,
      apiToken,
    });
  }

  private constructor(options: { url: string; apiToken: string }) {
    this.url = options.url;
    this.apiToken = options.apiToken;
  }

  getProviderName(): string {
    // Simply a string identifying your provider
    return 'authentik';
  }

  async getAllGroups(): Promise<Group[]> {
    const allGroups: Group[] = [];

    // Initial page to start fetching
    let currentPage = 1;

    // Recursive function to fetch users from a specific page
    const fetchGroupsFromPage = async (): Promise<void> => {
      try {
        const response: AxiosResponse<GroupResponse> = await axios.get(
          `${this.url}/groups/`,
          {
            params: { page: currentPage },
            headers: { Authorization: `Bearer ${this.apiToken}` },
          },
        );

        const groupsFromPage: Group[] = response.data.results;
        allGroups.push(...groupsFromPage);

        const totalPages = response.data.pagination.total_pages;
        const current = response.data.pagination.current;

        if (totalPages !== current) {
          currentPage++;
          await fetchGroupsFromPage();
        }
      } catch (error) {
        throw new Error(
          `Error fetching groups from page ${currentPage}: ${error}`,
        );
      }
    };

    await fetchGroupsFromPage();

    return allGroups;
  }

  async getAllUsers(): Promise<User[]> {
    const allUsers: User[] = [];

    // Initial page to start fetching
    let currentPage = 1;

    // Recursive function to fetch users from a specific page
    const fetchUsersFromPage = async (): Promise<void> => {
      try {
        const response: AxiosResponse<UserResponse> = await axios.get(
          `${this.url}/users/`,
          {
            params: { page: currentPage },
            headers: { Authorization: `Bearer ${this.apiToken}` },
          },
        );

        const usersFromPage: User[] = response.data.results;

        for (const user of usersFromPage) {
          if (user.email !== '') {
            allUsers.push(user);
          }
        }

        const totalPages = response.data.pagination.total_pages;
        const current = response.data.pagination.current;

        if (totalPages !== current) {
          currentPage++;
          await fetchUsersFromPage();
        }
      } catch (error) {
        throw new Error(
          `Error fetching users from page ${currentPage}: ${error}`,
        );
      }
    };

    await fetchUsersFromPage();

    return allUsers;
  }

  async connect(connection: EntityProviderConnection): Promise<void> {
    this.connection = connection;
    await this.fetchAndEmitEntities();
  }

  private transformGroupToEntity(group: Group): Entity {
    if (!group.name) {
      throw new Error(`Group name is missing for group: ${group.pk}`);
    }

    return {
      kind: 'Group',
      apiVersion: 'backstage.io/v1alpha1',
      metadata: {
        // name of the entity
        name: kebabCase(group.name),
        // name for display purposes could be anything including email
        title: group.name,
        annotations: {
          [ANNOTATION_LOCATION]: `url:${this.url}/groups/${group.pk}/`,
          [ANNOTATION_ORIGIN_LOCATION]: `url:${this.url}/groups/${group.pk}/`,
        },
      },
      spec: {
        type: 'team',
        profile: {
          displayName: group.name,
          picture: group.attributes.picture
            ? group.attributes.picture
            : undefined,
        },
        parent: group.parent_name
          ? `group:default/${kebabCase(group.parent_name)}`
          : undefined,
        children: [],
      },
    };
  }

  private transformUserToEntity(user: User, groups: Group[]): Entity {
    const links =
      user.pk !== null
        ? [
            {
              url: `url:${this.url}/users/${user.pk}/`,
              title: 'Authentik',
              icon: 'message',
            },
          ]
        : undefined;

    const belongingGroups = groups
      .filter(group =>
        group.users_obj.some(groupUser => groupUser.username === user.username),
      )
      .map(group => `group:default/${kebabCase(group.name)}`);

    // we can add any links here in this case it would be adding a slack link to the users so you can directly slack them.
    return {
      kind: 'User',
      apiVersion: 'backstage.io/v1alpha1',
      metadata: {
        // name of the entity
        name: user.username,
        // name for display purposes could be anything including email
        title: user.name,
        links,
        annotations: {
          [ANNOTATION_LOCATION]: `url:${this.url}/users/${user.pk}/`,
          [ANNOTATION_ORIGIN_LOCATION]: `url:${this.url}/users/${user.pk}/`,
        },
      },
      spec: {
        profile: {
          displayName: user.name,
          email: user.email,
          picture: user.avatar,
        },
        memberOf: belongingGroups,
      },
    };
  }

  async fetchAndEmitEntities(): Promise<void> {
    try {
      const groups = await this.getAllGroups();
      const users = await this.getAllUsers();

      const groupEntities = groups.map(group =>
        this.transformGroupToEntity(group),
      );
      const userEntities = users.map(user =>
        this.transformUserToEntity(user, groups),
      );

      await this.connection?.applyMutation({
        type: 'full',
        entities: [...groupEntities, ...userEntities].map(entity => ({
          entity,
          locationKey: `authentik-provider`,
        })),
      });
    } catch (error) {
      console.error('Error fetching entities from Authentik:', error);
    }
  }
}
