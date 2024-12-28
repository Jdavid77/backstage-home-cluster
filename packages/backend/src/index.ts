/*
 * Hi!
 *
 * Note that this is an EXAMPLE Backstage backend. Please check the README.
 *
 * Happy hacking!
 */

import { createBackend } from '@backstage/backend-defaults';
import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha';
import { AuthentikUserProvider } from '../entityProviders/AuthentikUserProvider';
import { authProvidersExtensionPoint, createOAuthProviderFactory } from '@backstage/plugin-auth-node';
import { oidcAuthenticator } from '@backstage/plugin-auth-backend-module-oidc-provider';

export const authentikAuthProvider = createBackendModule({
  pluginId: 'auth',
  moduleId: 'authentik.auth',
  register(reg) {
    reg.registerInit({
      deps: { providers: authProvidersExtensionPoint },
      async init({ providers }) {
        providers.registerProvider({
          providerId: 'authentik',
          factory: createOAuthProviderFactory({
            authenticator: oidcAuthenticator,
            async signInResolver(info, ctx) {

              const {
                result: {
                  fullProfile: { userinfo },
                },
              } = info; 

              console.log(userinfo);

              return ctx.signInWithCatalogUser({
                entityRef: { name: String(userinfo.nickname) },
              });
            },
          }),
        });
      },
    });
  },
});


export const catalogModuleAuthentikProvider = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'authentik.entities',
  register(env) {
    env.registerInit({
      deps: {
        catalog: catalogProcessingExtensionPoint,
        config: coreServices.rootConfig,
        scheduler: coreServices.scheduler,
      },
      async init({ catalog, config, scheduler }) {
        const authentikProvider = AuthentikUserProvider.fromConfig(config, {});

        catalog.addEntityProvider(authentikProvider);

        await scheduler.scheduleTask({
          id: 'authentik_entities_refresh',
          fn: async () => {
            await authentikProvider.fetchAndEmitEntities();
          },
          frequency: { minutes: 30 },
          timeout: { minutes: 2 },
        });
      },
    });
  },
});


const backend = createBackend();


backend.add(import('@backstage/plugin-app-backend'));
backend.add(import('@backstage/plugin-proxy-backend'));
backend.add(import('@backstage/plugin-scaffolder-backend'));
backend.add(import('@backstage/plugin-techdocs-backend'));

// auth plugin
backend.add(import('@backstage/plugin-auth-backend'));
// See https://backstage.io/docs/backend-system/building-backends/migrating#the-auth-plugin
backend.add(import('@backstage/plugin-auth-backend-module-guest-provider'));
// See https://backstage.io/docs/auth/guest/provider

// catalog plugin
backend.add(import('@backstage/plugin-catalog-backend'));
backend.add(
  import('@backstage/plugin-catalog-backend-module-scaffolder-entity-model'),
);

// See https://backstage.io/docs/features/software-catalog/configuration#subscribing-to-catalog-errors
backend.add(import('@backstage/plugin-catalog-backend-module-logs'));

// permission plugin
backend.add(import('@backstage/plugin-permission-backend'));
// See https://backstage.io/docs/permissions/getting-started for how to create your own permission policy
backend.add(
  import('@backstage/plugin-permission-backend-module-allow-all-policy'),
);

// search plugin
backend.add(import('@backstage/plugin-search-backend'));

// search engine
// See https://backstage.io/docs/features/search/search-engines
backend.add(import('@backstage/plugin-search-backend-module-pg'));

// search collators
backend.add(import('@backstage/plugin-search-backend-module-catalog'));
backend.add(import('@backstage/plugin-search-backend-module-techdocs'));

// kubernetes
backend.add(import('@backstage/plugin-kubernetes-backend'));

// S3
backend.add(import('@spreadshirt/backstage-plugin-s3-viewer-backend'));

// DevTools
backend.add(import('@backstage/plugin-devtools-backend'));

// Auth
backend.add(catalogModuleAuthentikProvider);
backend.add(authentikAuthProvider);

// StackOverflow
backend.add(
    import('@backstage/plugin-search-backend-module-stack-overflow-collator'),
);

backend.start();
