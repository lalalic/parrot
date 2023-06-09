module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['@babel/plugin-syntax-dynamic-import'],
    comments: true,
    retainLines: true,
  }
}
