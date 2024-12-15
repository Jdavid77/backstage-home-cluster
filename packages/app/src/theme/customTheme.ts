import {
  createBaseThemeOptions,
  createUnifiedTheme,
  genPageTheme,
  palettes,
  shapes,
} from '@backstage/theme';


// Props to: https://tech-blog.exxcellent.de/posts/2024-01-10-backstage-part1-customizing/backstage-part1-customizing
// Can't be asked to make one from scratch lol , fuck that
export const customTheme = createUnifiedTheme({
  palette: {
    ...palettes.light, // based on light theme
    primary: {
      main: '#35abe2', // light blue
    },
    secondary: {
      main: '#565a6e', // Darker blue grey
    },
    error: {
      main: '#8c4351',
    },
    warning: {
      main: '#8f5e15',
    },
    info: {
      main: '#35abe2',
    },
    success: {
      main: '#35abe2',
    },
    background: {
      default: '#ffffff',
      paper: '#f4f4f4', // Light grey
    },
    banner: {
      info: '#35abe2', // light blue banner
      error: '#8c4351',
      text: '#343b58',
      link: '#565a6e',
    },
    errorBackground: '#8c4351',
    warningBackground: '#8f5e15',
    infoBackground: '#343b58',
    navigation: {
      submenu: {
        background: '#35abe2', // light blue
      },
      background: '#f4f4f4', // Lighter grey
      indicator: '#9d599f', // lilac as indicator
      selectedColor: '#9d599f', // same as indicator
      color: '#0d456b', // dark blue for unselected items
      navItem: {
        hoverBackground: '#35abe2', // light blue
      },
    },
  },
  pageTheme: {
    home: genPageTheme({ colors: ['#0d456b', '#9d599f'], shape: shapes.wave }),
    documentation: genPageTheme({
      colors: ['#0d456b', '#9d599f'],
      shape: shapes.wave,
    }),
    project: genPageTheme({
      colors: ['#0d456b', '#0d456b'],
      shape: shapes.wave,
    }),
    tool: genPageTheme({
      colors: ['#9d599f', '#9d599f'],
      shape: shapes.round,
    }),
    library: genPageTheme({
      colors: ['#9d599f', '#9d599f'],
      shape: shapes.round,
    }),
    technique: genPageTheme({
      colors: ['#9d599f', '#9d599f'],
      shape: shapes.round,
    }),
    other: genPageTheme({ colors: ['#0d456b', '#9d599f'], shape: shapes.wave }),
    apis: genPageTheme({ colors: ['#0d456b', '#9d599f'], shape: shapes.wave }),
  },
  fontFamily: '"DIN OT", Helvetica, Arial, sans-serif',
  components: {
    BackstageInfoCard: {
      styleOverrides: {},
    },
    BackstageSidebarItem: {
      styleOverrides: {
        root: {
          textDecorationLine: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none', // Remove uppercase text
        },
        containedPrimary: {
          '&:hover': {
            backgroundColor: '#35abe2', // light blue on hover
          },
          color: '#FFFFFF',
        },
        containedSecondary: {
          '&:hover': {
            backgroundColor: '#35abe2', // light blue on hover
          },
          color: '#FFFFFF',
        },
      },
    },
  },
});  
