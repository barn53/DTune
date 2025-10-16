# SVG Shaper Editor - Test Framework Documentation

## Overview

This test framework provides comprehensive regression testing for the SVG Shaper Editor application. It includes unit tests, integration tests, and a web-based test runner with detailed reporting.

## 🚀 Quick Start

1. **Run Tests in Browser:**
   - Open `test/test-runner.html` in your browser
   - Click "Run Tests" to execute all tests
   - View real-time results and detailed reports

2. **Run Tests via Console:**
   ```javascript
   // In browser console after loading test files
   runTests().then(results => console.log(results));
   ```

## 📁 Project Structure

```
test/
├── README.md                    # This documentation
├── test-runner.html            # Web-based test runner interface
├── framework/                  # Test framework core
│   ├── test-runner.js         # Main test runner and assertion library
│   └── test-utils.js          # Utility functions and helpers
├── unit/                      # Unit tests
│   ├── measurement-system.test.js    # MeasurementSystem tests
│   └── shaper-constants.test.js      # ShaperConstants/Utils tests
└── integration/               # Integration tests
    └── file-loading.test.js   # File loading workflow tests
```

## 🧪 Test Categories

### Unit Tests
Tests individual functions and classes in isolation:
- **MeasurementSystem**: Unit conversion, parsing, formatting
- **ShaperConstants**: Constants, validation, utilities
- **ShaperUtils**: Attribute management, element synchronization

### Integration Tests
Tests complete workflows and component interactions:
- **File Loading**: SVG parsing, element analysis, state management
- **Error Handling**: Graceful failure scenarios
- **Performance**: Large file processing efficiency

## 📝 Writing Tests

### Basic Test Structure

```javascript
describe('Feature Name', () => {
    let testVariable;

    beforeEach(() => {
        // Setup before each test
        testVariable = new SomeClass();
    });

    afterEach(() => {
        // Cleanup after each test
        TestUtils.cleanup();
    });

    it('should perform expected behavior', () => {
        // Arrange
        const input = 'test-input';

        // Act
        const result = testVariable.someMethod(input);

        // Assert
        expect(result).toBe('expected-output');
    });
});
```

### Available Assertions

```javascript
// Equality
expect(actual).toBe(expected);           // Strict equality (===)
expect(actual).toEqual(expected);        // Deep equality

// Truthiness
expect(actual).toBeTruthy();
expect(actual).toBeFalsy();
expect(actual).toBeDefined();
expect(actual).toBeUndefined();
expect(actual).toBeNull();

// Numbers
expect(actual).toBeGreaterThan(5);
expect(actual).toBeLessThan(10);
expect(actual).toBeCloseTo(3.14, 2);    // Within precision

// Strings and Arrays
expect(actual).toContain('substring');
expect(array).toContain(item);

// Exceptions
expect(() => {
    throwingFunction();
}).toThrow();
expect(() => {
    throwingFunction();
}).toThrow('Expected error message');

// Negation
expect(actual).not.toBe(unexpected);
```

### Test Utilities

```javascript
// DOM Testing
const container = TestUtils.createTestContainer();
const svg = TestUtils.createTestSVG({
    width: 200,
    height: 150,
    elements: [
        {
            type: 'rect',
            attributes: { x: '10', y: '10', width: '50', height: '30' },
            shaperAttributes: { cutType: 'outside', cutDepth: '15mm' }
        }
    ]
});

// Event Simulation
const mouseEvent = TestUtils.createMouseEvent('click', { clientX: 100, clientY: 50 });
const keyEvent = TestUtils.createKeyboardEvent('keydown', 'Enter');

// File Testing
const svgFile = TestUtils.createTestSVGFile(svgContent, 'test.svg');
TestUtils.simulateFileInput(fileInput, svgFile);

// Assertions
TestUtils.assertElementExists('.my-selector');
TestUtils.assertHasClass(element, 'expected-class');

// Performance
TestUtils.measurePerformance(() => {
    // Code to measure
}, 'operation-name');

// Validation
TestUtils.validateSVGString(svgContent);

// Cleanup (automatically called after each test)
TestUtils.cleanup();
```

### Test Fixtures

Pre-built SVG content for testing:

```javascript
TestUtils.fixtures.simpleRect        // Basic rectangle
TestUtils.fixtures.rectWithShaper    // Rectangle with shaper attributes
TestUtils.fixtures.multipleElements  // Multiple elements with attributes
TestUtils.fixtures.complexPath       // Complex path element
```

## 🔧 Test Configuration

### Browser Requirements
- Modern browser with ES6+ support
- Local file access (serve via HTTP for security)

### Dependencies
The test framework is self-contained but requires:
- Application modules: `shaperConstants.js`, `measurementSystem.js`
- DOM environment for integration tests

### Test Isolation
Each test runs in isolation with:
- Clean DOM state
- Reset global variables
- Cleared localStorage test data
- Fresh instances of tested classes

## 📊 Test Reports

### Console Output
- ✅ **PASS**: Test name
- ❌ **FAIL**: Test name with error details
- ⏭️ **SKIP**: Skipped test name
- 📦 **Test Suite**: Suite name

### Summary Report
```
📊 TEST RESULTS SUMMARY
========================
Total Tests:    45
✅ Passed:      43
❌ Failed:      2
⏭️ Skipped:     0
📈 Pass Rate:   95.6%
⏱️ Duration:    1247ms
```

### Failed Test Details
```
❌ FAILED TESTS:
   • MeasurementSystem > should parse invalid units: Expected null but got 10
   • File Loading > should handle malformed SVG: Timeout after 5000ms
```

## 🎯 Best Practices

### Test Organization
1. **Group related tests** in `describe` blocks
2. **Use descriptive test names** that explain expected behavior
3. **Keep tests focused** on single functionality
4. **Use setup/teardown** for common initialization

### Test Data
1. **Use Test Fixtures** for consistent test data
2. **Create minimal test cases** that cover edge cases
3. **Avoid hardcoded values** when possible
4. **Test both success and failure scenarios**

### Performance
1. **Keep tests fast** (< 100ms per test preferred)
2. **Use performance tests** for critical operations
3. **Mock external dependencies** to avoid network calls
4. **Clean up resources** after each test

### Debugging
1. **Use descriptive assertion messages**
2. **Add console.log** for debugging (remove before commit)
3. **Test in isolation** to identify specific failures
4. **Check browser dev tools** for detailed error information

## 🚨 Troubleshooting

### Common Issues

**Tests not running:**
- Check browser console for JavaScript errors
- Ensure all required files are loaded
- Verify file paths are correct

**Tests failing unexpectedly:**
- Clear browser cache
- Check for global state pollution
- Verify test isolation with `TestUtils.cleanup()`

**Performance issues:**
- Reduce test complexity
- Use mocks for heavy operations
- Check for memory leaks in test setup

**DOM-related failures:**
- Ensure elements are properly created
- Check for timing issues with async operations
- Verify cleanup is removing test elements

### Browser Compatibility
- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Mobile browsers**: Basic support (may need adjustments)

## 🔄 Continuous Integration

### Adding New Tests
1. Create test file in appropriate directory (`unit/` or `integration/`)
2. Add script tag to `test-runner.html`
3. Follow naming convention: `feature-name.test.js`
4. Include comprehensive test coverage

### Regression Testing
Run tests after:
- Code changes to core modules
- New feature additions
- Bug fixes
- Refactoring operations

### Coverage Goals
- **Unit tests**: >90% code coverage for core modules
- **Integration tests**: Cover all major user workflows
- **Edge cases**: Handle error conditions and boundary cases

## 📈 Extending the Framework

### Adding New Assertions
```javascript
// In test-utils.js
static assertCustomCondition(value, expected, message) {
    if (/* custom logic */) {
        throw new Error(message || `Custom assertion failed`);
    }
}
```

### Adding New Test Types
1. Create new directory under `test/`
2. Add corresponding checkbox to test runner UI
3. Update test runner logic to handle new category

### Mock Objects
```javascript
// Create mock for external dependencies
const mockFileManager = {
    loadSVG: createMock(() => Promise.resolve(mockSVGData)),
    saveSVG: createMock()
};
```

## 📞 Support

For questions or issues with the test framework:
1. Check this documentation first
2. Review existing tests for examples
3. Check browser console for detailed error messages
4. Create minimal reproduction case for debugging

---

**Happy Testing! 🧪✨**

*Keep tests simple, focused, and reliable to maintain confidence in your codebase.*
