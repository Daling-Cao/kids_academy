// We will use native fetch in latest node
const baseUrl = 'http://localhost:3000';

async function runTests() {
    console.log('--- Starting Malicious Tests ---');

    // 1. Login as Student A
    const loginRes1 = await fetch(`${baseUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'student', password: 'password' })
    });
    const data1 = await loginRes1.json();
    const tokenA = data1.token;
    const studentAId = data1.user.id;
    console.log(`Student A login successful (ID: ${studentAId})`);

    // Target Student B (ID = 3 for example, or any ID != studentAId)
    const targetId = studentAId === 2 ? 3 : 2;

    console.log(`\n[Test 1] IDOR: Student A tries to view Student B's projects progress`);
    const res1 = await fetch(`${baseUrl}/api/student/buildings/1/projects/${targetId}`, {
        headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    console.log(`Status: ${res1.status}`); // Should be 403
    const txt1 = await res1.text();
    console.log(`Response: ${txt1}`);

    console.log(`\n[Test 2] IDOR: Student A tries to start a project for Student B`);
    const res2 = await fetch(`${baseUrl}/api/student/projects/1/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
        body: JSON.stringify({ userId: targetId })
    });
    console.log(`Status: ${res2.status}`); // Should be 403
    const txt2 = await res2.text();
    console.log(`Response: ${txt2}`);

    console.log(`\n[Test 3] Error Handler: Triggering an error by sending invalid JSON`);
    const res3 = await fetch(`${baseUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"invalid_json": '
    });
    console.log(`Status: ${res3.status}`);
    const txt3 = await res3.text();
    console.log(`Response: ${txt3}`);

    console.log('\n--- Malicious Tests Completed ---');
}

runTests();
