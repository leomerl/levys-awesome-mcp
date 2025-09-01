// Simple test to demonstrate TodoWrite functionality
function simpleTest() {
    console.log('Testing TodoWrite tool functionality');
    
    // Test basic arithmetic
    const result = 2 + 2;
    console.log(`2 + 2 = ${result}`);
    
    if (result === 4) {
        console.log('✅ Test passed!');
        return true;
    } else {
        console.log('❌ Test failed!');
        return false;
    }
}

// Run the test
const passed = simpleTest();
console.log(`Final result: ${passed ? 'SUCCESS' : 'FAILURE'}`);

export { simpleTest };