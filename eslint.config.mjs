import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
    {
        ignores: [
            "dist/**",
            "node_modules/**",
            "coverage/**",
            "src/modules/auth/**",
            "src/shared/core/**",
            "src/container/services/**",
            "src/container/controllers/**",
            "src/container/repositories/**",
        ],
    },

    js.configs.recommended,

    ...tseslint.configs.recommended,

    {
        files: ["src/**/*.ts"],

        languageOptions: {
            globals: globals.node,
            ecmaVersion: "latest",
            sourceType: "module",
        },

        rules: {
            // Allow intentionally unused args prefixed with _
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                },
            ],

            // Prevent accidental any
            "@typescript-eslint/no-explicit-any": "warn",

            // Encourage const
            "prefer-const": "warn",

            // Remove dead code
            "no-unreachable": "error",

            // Catch accidental debugger
            "no-debugger": "error",

            // Catch accidental console left in production
            "no-console": [
                "warn",
                {
                    allow: ["info", "debug", "warn", "error"],
                },
            ],
        },
    },
    {
        files: ["scripts/**/*.mjs"],
        languageOptions: {
            globals: globals.node,
            ecmaVersion: "latest",
            sourceType: "module",
        },
    },
];
