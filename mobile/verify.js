// Quick structure verify
const fs = require('fs');
const screens = fs.readdirSync('src/screens').filter(f => f.endsWith('.tsx'));
const expected = [
  'AnalyzeScreen.tsx', 'CameraScreen.tsx', 
  'ClientsScreen.tsx', 'CommunityScreen.tsx', 'DashboardScreen.tsx',
  'FormulateScreen.tsx', 'GalleryScreen.tsx', 'HistoryScreen.tsx',
  'InventoryScreen.tsx', 'LibraryScreen.tsx',
  'QuestionnaireScreen.tsx', 'ServiceScreen.tsx', 'SettingsScreen.tsx',
  'SubscriptionScreen.tsx'
];

const app = fs.readFileSync('App.tsx', 'utf8');
const drawer = fs.readFileSync('src/components/SidebarDrawer.tsx', 'utf8');
const combined = app + drawer;

const checks = [
  ['Menu', app.includes('Menu'), 'Hamburger Menu icon in header'],
  ['FlaskConical', combined.includes('FlaskConical'), 'Formulate has flask icon'],
  ['Analyze label', drawer.includes('Analyze') && !drawer.includes('"Camera"'), 'Analyze (not Camera)'],
  ['LayoutDashboard', combined.includes('LayoutDashboard'), 'Dashboard icon'],
  ['CirclePlus', combined.includes('CirclePlus'), 'New Service icon'],
  ['SidebarDrawer', fs.existsSync('src/components/SidebarDrawer.tsx'), 'SidebarDrawer exists'],
  ['#0F0F1A', combined.includes('#0F0F1A'), 'Correct bg color'],
  ['#F5F5F7', combined.includes('#F5F5F7'), 'Correct text color'],
  ['#A1A1AA', combined.includes('#A1A1AA'), 'Correct inactive color'],
  ['no-bottom-tabs', !app.includes('createBottomTabNavigator'), 'No bottom tabs'],
  ['no-more-drawer', !fs.existsSync('src/components/MoreDrawer.tsx'), 'MoreDrawer removed'],
  ['no-action-sheet', !fs.existsSync('src/components/ServiceActionSheet.tsx'), 'ServiceActionSheet removed'],
];

console.log('=== Navigation Check ===');
checks.forEach(([name, pass, desc]) => {
  console.log(`${pass ? '✅' : '❌'} ${desc}`);
});

console.log(`\n=== Screens (${screens.length}/${expected.length}) ===`);
const missing = expected.filter(e => !screens.includes(e));
if (missing.length === 0) {
  console.log('✅ All screens present');
} else {
  missing.forEach(m => console.log(`❌ Missing: ${m}`));
}
