#!/usr/bin/env node

// Test script to see what data OpenAI returns in a simple API response
require('dotenv').config({ path: '.env.local' });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not found in .env.local');
  process.exit(1);
}

console.log('🔑 OpenAI API Key found:', OPENAI_API_KEY.substring(0, 10) + '...');
console.log('\n📨 Sending a simple test request to OpenAI API...\n');

async function testSimpleRequest() {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: 'Say "Hello, World!" and nothing else.'
          }
        ],
        max_tokens: 50
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, response.statusText);
      console.error('Response:', errorText);
      process.exit(1);
    }

    const data = await response.json();

    console.log('✅ Request successful!\n');
    console.log('📊 FULL API RESPONSE:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(data, null, 2));
    console.log('='.repeat(80));

    // Extract and highlight usage information
    if (data.usage) {
      console.log('\n💡 USAGE INFORMATION FOUND:');
      console.log('─'.repeat(80));
      console.log(`   Model: ${data.model || 'unknown'}`);
      console.log(`   Prompt Tokens (Input): ${data.usage.prompt_tokens || 0}`);
      console.log(`   Completion Tokens (Output): ${data.usage.completion_tokens || 0}`);
      console.log(`   Total Tokens: ${data.usage.total_tokens || 0}`);

      if (data.usage.prompt_tokens_details) {
        console.log('\n   📋 Prompt Token Details:');
        console.log(`      ${JSON.stringify(data.usage.prompt_tokens_details, null, 2)}`);
      }

      if (data.usage.completion_tokens_details) {
        console.log('\n   📝 Completion Token Details:');
        console.log(`      ${JSON.stringify(data.usage.completion_tokens_details, null, 2)}`);
      }
      console.log('─'.repeat(80));

      // Calculate cost estimate
      const inputCost = (data.usage.prompt_tokens / 1_000_000) * 0.150; // gpt-4o-mini
      const outputCost = (data.usage.completion_tokens / 1_000_000) * 0.600;
      const totalCost = inputCost + outputCost;

      console.log('\n💰 COST ESTIMATE (GPT-4o-mini):');
      console.log('─'.repeat(80));
      console.log(`   Input Cost: $${inputCost.toFixed(6)}`);
      console.log(`   Output Cost: $${outputCost.toFixed(6)}`);
      console.log(`   Total Cost: $${totalCost.toFixed(6)}`);
      console.log('─'.repeat(80));
    } else {
      console.log('\n⚠️  NO USAGE INFORMATION in response');
    }

    // Show the actual response message
    if (data.choices && data.choices[0] && data.choices[0].message) {
      console.log('\n💬 ASSISTANT RESPONSE:');
      console.log('─'.repeat(80));
      console.log(`   "${data.choices[0].message.content}"`);
      console.log('─'.repeat(80));
    }

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Error testing OpenAI API:', error.message);
    process.exit(1);
  }
}

testSimpleRequest();
