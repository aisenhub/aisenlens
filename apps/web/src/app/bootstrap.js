import '../styles/main.css';
import { getAppRoute } from './routes.js';

const route = getAppRoute();
const libraryView = document.getElementById('projectLibraryView');
const editorShell = document.getElementById('editorShell');

if (route.name === 'library') {
  if (libraryView) libraryView.hidden = false;
  await import('./library-entry.js');
} else {
  if (editorShell) editorShell.hidden = false;
  await import('../main.js');
}
