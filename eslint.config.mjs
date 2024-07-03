import globals from "globals";

export default [
  {
    rules: {
      "indent": "off",
      "prefer-spread": "off",
      "require-jsdoc": "off",
      "linebreak-style": "off",
      "no-dupe-keys": "error",
      "no-unused-vars": "error",
      "strict": ["error", "global"],
      "no-undef": "error",  
      "quotes": [
        "error",
        "double",
        { avoidEscape: true, allowTemplateLiterals: false },
      ],
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser
      }
    },
  }
];
