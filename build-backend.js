import esbuild from 'esbuild';

esbuild.build({
  entryPoints: ['api-src/[...route].ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  outfile: 'api/[...route].js',
}).then(() => {
  console.log('Backend build succeeded!');
}).catch((err) => {
  console.error('Backend build failed:', err);
  process.exit(1);
});
