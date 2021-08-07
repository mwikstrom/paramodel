const config = {
    preset: "ts-jest/presets/default-esm",
    testEnvironment: "node",
    testRegex: "test/.*\\.spec\\.ts$",
    collectCoverage: true,
    coverageDirectory: "coverage",
    collectCoverageFrom: ["src/**/*.ts"],
    globals: {
        "ts-jest": {
            useESM: true
        }
    }
};

module.exports = config;
