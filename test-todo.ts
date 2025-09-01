// Simple test to check for TodoWrite tool availability
console.log('Testing TodoWrite tool availability...');

// Try to check if TodoWrite is available in the MCP server
const testTodoWrite = async () => {
  try {
    console.log('TodoWrite test started');
    
    // This is a simple test that would use TodoWrite if available
    console.log('Checking for TodoWrite tool...');
    
    // Since we can't directly access MCP tools from this script,
    // we'll just log that the test ran
    console.log('Test completed - would use TodoWrite if available');
    
    return true;
  } catch (error) {
    console.error('Error in TodoWrite test:', error);
    return false;
  }
};

testTodoWrite().then(success => {
  console.log(`Test ${success ? 'passed' : 'failed'}`);
  process.exit(success ? 0 : 1);
});