export default {
  plugins: {
    "postcss-discard-duplicates": {},
    cssnano: {
      preset: ["default", { discardComments: { removeAll: true } }],
    },
  },
};
