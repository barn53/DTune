/**
 * Test Framework - Main Test Runner
 *
 * A lightweight, modern test framework built specifically for the SVG Shaper Editor.
 * Provides unit testing, integration testing, and UI testing capabilities with
 * detailed reporting and coverage analysis.
 */

class TestRunner {
    constructor() {
        this.tests = [];
        this.results = {
            passed: 0,
            failed: 0,
            skipped: 0,
            total: 0,
            details: []
        };
        this.currentSuite = null;
        this.beforeEachHooks = [];
        this.afterEachHooks = [];
        this.beforeAllHooks = [];
        this.afterAllHooks = [];
        this.timeout = 5000; // Default 5 second timeout
        this.setupDone = false;
    }

    /**
     * Define a test suite
     */
    describe(suiteName, callback) {
        const previousSuite = this.currentSuite;
        this.currentSuite = suiteName;

        console.log(`\n📦 Test Suite: ${suiteName}`);

        try {
            callback();
        } catch (error) {
            console.error(`❌ Error in test suite '${suiteName}':`, error);
        }

        this.currentSuite = previousSuite;
    }

    /**
     * Define a test case
     */
    it(testName, testFn, options = {}) {
        if (options.skip) {
            this.results.skipped++;
            this.results.total++;
            console.log(`⏭️  SKIP: ${testName}`);
            return;
        }

        this.tests.push({
            name: testName,
            suite: this.currentSuite,
            fn: testFn,
            timeout: options.timeout || this.timeout
        });
    }

    /**
     * Skip a test
     */
    xit(testName, testFn) {
        this.it(testName, testFn, { skip: true });
    }

    /**
     * Setup hooks
     */
    beforeEach(fn) {
        this.beforeEachHooks.push(fn);
    }

    afterEach(fn) {
        this.afterEachHooks.push(fn);
    }

    beforeAll(fn) {
        this.beforeAllHooks.push(fn);
    }

    afterAll(fn) {
        this.afterAllHooks.push(fn);
    }

    /**
     * Run all tests
     */
    async run() {
        console.log('\n🚀 Starting Test Runner...\n');

        const startTime = Date.now();

        // Run beforeAll hooks
        for (const hook of this.beforeAllHooks) {
            try {
                await hook();
            } catch (error) {
                console.error('❌ beforeAll hook failed:', error);
                return this.generateReport(startTime);
            }
        }

        // Run tests
        for (const test of this.tests) {
            await this.runSingleTest(test);
        }

        // Run afterAll hooks
        for (const hook of this.afterAllHooks) {
            try {
                await hook();
            } catch (error) {
                console.error('❌ afterAll hook failed:', error);
            }
        }

        return this.generateReport(startTime);
    }

    /**
     * Run a single test
     */
    async runSingleTest(test) {
        const testName = test.suite ? `${test.suite} > ${test.name}` : test.name;
        this.results.total++;

        try {
            // Run beforeEach hooks
            for (const hook of this.beforeEachHooks) {
                await hook();
            }

            // Run the test with timeout
            await this.runWithTimeout(test.fn, test.timeout);

            // Run afterEach hooks
            for (const hook of this.afterEachHooks) {
                await hook();
            }

            this.results.passed++;
            console.log(`✅ PASS: ${testName}`);
            this.results.details.push({
                name: testName,
                status: 'passed',
                duration: 0
            });

        } catch (error) {
            this.results.failed++;
            console.error(`❌ FAIL: ${testName}`);
            console.error(`   Error: ${error.message}`);
            if (error.stack) {
                console.error(`   Stack: ${error.stack.split('\n')[1]?.trim()}`);
            }

            this.results.details.push({
                name: testName,
                status: 'failed',
                error: error.message,
                stack: error.stack
            });
        }
    }

    /**
     * Run function with timeout
     */
    async runWithTimeout(fn, timeout) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Test timed out after ${timeout}ms`));
            }, timeout);

            try {
                const result = fn();

                if (result && typeof result.then === 'function') {
                    // Handle promise
                    result
                        .then(() => {
                            clearTimeout(timer);
                            resolve();
                        })
                        .catch((error) => {
                            clearTimeout(timer);
                            reject(error);
                        });
                } else {
                    // Synchronous test
                    clearTimeout(timer);
                    resolve();
                }
            } catch (error) {
                clearTimeout(timer);
                reject(error);
            }
        });
    }

    /**
     * Generate test report
     */
    generateReport(startTime) {
        const duration = Date.now() - startTime;
        const passRate = this.results.total > 0 ?
            ((this.results.passed / this.results.total) * 100).toFixed(1) : 0;

        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST RESULTS SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Tests:    ${this.results.total}`);
        console.log(`✅ Passed:      ${this.results.passed}`);
        console.log(`❌ Failed:      ${this.results.failed}`);
        console.log(`⏭️  Skipped:     ${this.results.skipped}`);
        console.log(`📈 Pass Rate:   ${passRate}%`);
        console.log(`⏱️  Duration:    ${duration}ms`);
        console.log('='.repeat(60));

        if (this.results.failed > 0) {
            console.log('\n❌ FAILED TESTS:');
            this.results.details
                .filter(test => test.status === 'failed')
                .forEach(test => {
                    console.log(`   • ${test.name}: ${test.error}`);
                });
        }

        return {
            ...this.results,
            duration,
            passRate: parseFloat(passRate),
            success: this.results.failed === 0
        };
    }
}

/**
 * Assertion Library
 */
class Expect {
    constructor(actual) {
        this.actual = actual;
        this.isNegated = false;
    }

    get not() {
        this.isNegated = !this.isNegated;
        return this;
    }

    toBe(expected) {
        const condition = this.actual === expected;
        this.assert(condition, `Expected ${this.actual} to be ${expected}`, `Expected ${this.actual} not to be ${expected}`);
        return this;
    }

    toEqual(expected) {
        const condition = JSON.stringify(this.actual) === JSON.stringify(expected);
        this.assert(condition, `Expected ${JSON.stringify(this.actual)} to equal ${JSON.stringify(expected)}`, `Expected ${JSON.stringify(this.actual)} not to equal ${JSON.stringify(expected)}`);
        return this;
    }

    toBeNull() {
        const condition = this.actual === null;
        this.assert(condition, `Expected ${this.actual} to be null`, `Expected ${this.actual} not to be null`);
        return this;
    }

    toBeUndefined() {
        const condition = this.actual === undefined;
        this.assert(condition, `Expected ${this.actual} to be undefined`, `Expected ${this.actual} not to be undefined`);
        return this;
    }

    toBeDefined() {
        const condition = this.actual !== undefined;
        this.assert(condition, `Expected ${this.actual} to be defined`, `Expected ${this.actual} not to be defined`);
        return this;
    }

    toBeTruthy() {
        const condition = !!this.actual;
        this.assert(condition, `Expected ${this.actual} to be truthy`, `Expected ${this.actual} not to be truthy`);
        return this;
    }

    toBeFalsy() {
        const condition = !this.actual;
        this.assert(condition, `Expected ${this.actual} to be falsy`, `Expected ${this.actual} not to be falsy`);
        return this;
    }

    toContain(expected) {
        let condition = false;
        if (typeof this.actual === 'string') {
            condition = this.actual.includes(expected);
        } else if (Array.isArray(this.actual)) {
            condition = this.actual.includes(expected);
        } else if (this.actual && typeof this.actual.has === 'function') {
            condition = this.actual.has(expected);
        }
        this.assert(condition, `Expected ${this.actual} to contain ${expected}`, `Expected ${this.actual} not to contain ${expected}`);
        return this;
    }

    toBeGreaterThan(expected) {
        const condition = this.actual > expected;
        this.assert(condition, `Expected ${this.actual} to be greater than ${expected}`, `Expected ${this.actual} not to be greater than ${expected}`);
        return this;
    }

    toBeLessThan(expected) {
        const condition = this.actual < expected;
        this.assert(condition, `Expected ${this.actual} to be less than ${expected}`, `Expected ${this.actual} not to be less than ${expected}`);
        return this;
    }

    toBeCloseTo(expected, precision = 2) {
        const power = Math.pow(10, precision);
        const condition = Math.round((this.actual - expected) * power) === 0;
        this.assert(condition, `Expected ${this.actual} to be close to ${expected}`, `Expected ${this.actual} not to be close to ${expected}`);
        return this;
    }

    toThrow(expectedError) {
        let condition = false;
        let actualError = null;

        try {
            if (typeof this.actual === 'function') {
                this.actual();
            }
        } catch (error) {
            actualError = error;
            if (expectedError) {
                if (typeof expectedError === 'string') {
                    condition = error.message.includes(expectedError);
                } else if (expectedError instanceof RegExp) {
                    condition = expectedError.test(error.message);
                } else {
                    condition = error instanceof expectedError;
                }
            } else {
                condition = true;
            }
        }

        if (expectedError) {
            this.assert(condition, `Expected function to throw ${expectedError}, but got ${actualError?.message || 'no error'}`, `Expected function not to throw ${expectedError}`);
        } else {
            this.assert(condition, `Expected function to throw an error`, `Expected function not to throw an error`);
        }
        return this;
    }

    assert(condition, positiveMessage, negativeMessage) {
        const shouldPass = this.isNegated ? !condition : condition;
        if (!shouldPass) {
            const message = this.isNegated ? negativeMessage : positiveMessage;
            throw new Error(message);
        }
    }
}

/**
 * Mock and Spy utilities
 */
class Mock {
    constructor(implementation) {
        this.calls = [];
        this.results = [];
        this.implementation = implementation;
        this.returnValue = undefined;
        this.hasReturnValue = false;
    }

    mockReturnValue(value) {
        this.returnValue = value;
        this.hasReturnValue = true;
        return this;
    }

    mockImplementation(fn) {
        this.implementation = fn;
        return this;
    }

    mockResolvedValue(value) {
        this.implementation = () => Promise.resolve(value);
        return this;
    }

    mockRejectedValue(error) {
        this.implementation = () => Promise.reject(error);
        return this;
    }

    // The actual mock function
    call(...args) {
        this.calls.push(args);

        try {
            let result;
            if (this.hasReturnValue) {
                result = this.returnValue;
            } else if (this.implementation) {
                result = this.implementation(...args);
            }

            this.results.push({ type: 'return', value: result });
            return result;
        } catch (error) {
            this.results.push({ type: 'throw', value: error });
            throw error;
        }
    }

    // Assertion helpers
    toHaveBeenCalled() {
        return this.calls.length > 0;
    }

    toHaveBeenCalledTimes(times) {
        return this.calls.length === times;
    }

    toHaveBeenCalledWith(...args) {
        return this.calls.some(call =>
            call.length === args.length &&
            call.every((arg, i) => arg === args[i])
        );
    }

    clear() {
        this.calls = [];
        this.results = [];
        return this;
    }
}

// Global test functions
const testRunner = new TestRunner();

// Export test functions to global scope
window.describe = testRunner.describe.bind(testRunner);
window.it = testRunner.it.bind(testRunner);
window.xit = testRunner.xit.bind(testRunner);
window.beforeEach = testRunner.beforeEach.bind(testRunner);
window.afterEach = testRunner.afterEach.bind(testRunner);
window.beforeAll = testRunner.beforeAll.bind(testRunner);
window.afterAll = testRunner.afterAll.bind(testRunner);
window.expect = (actual) => new Expect(actual);
window.createMock = (implementation) => {
    const mock = new Mock(implementation);
    return (...args) => mock.call(...args);
};

// Export classes for advanced usage
window.TestRunner = TestRunner;
window.Expect = Expect;
window.Mock = Mock;

// Auto-run tests if requested
window.runTests = () => testRunner.run();
