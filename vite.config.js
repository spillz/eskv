export default {
  build: {
    target: 'es2022', //es2019
    minify: true,
    lib: {
      entry: 'lib/eskv.js', // Entry file for your library
      name: 'eskv', // Global variable when using UMD
      fileName: (format) => `eskv.${format}.js`
    },
    rollupOptions: {
      // Externalize dependencies, if any
      external: ['dependency-name'],
      output: {
        // Configure output formats and options here
        globals: {
          'dependency-name': 'DependencyGlobal'
        }
      }
    }
  },
  base: './',
};