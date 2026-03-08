const bcrypt = require('bcrypt');
const readline = require('readline');

const saltRounds = 12;

function generateHash(password) {
    if (!password) {
        console.error('Error: Password cannot be empty.');
        process.exit(1);
    }
    
    bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) {
            console.error('Error hashing password:', err);
            process.exit(1);
        }
        console.log('\n--- NEW HASH GENERATED ---');
        console.log(hash);
        console.log('---------------------------\n');
        console.log('Copy the code above and replace the value of ADMIN_PASSWORD_HASH in your .env file.');
        process.exit(0);
    });
}

const passwordArg = process.argv[2];

if (passwordArg) {
    // If password is provided as argument, use it directly (requires quotes for special chars)
    generateHash(passwordArg);
} else {
    // If no argument, enter interactive mode
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log('--- SJR Portfolio Password Hasher ---');
    console.log('No password provided as an argument.');
    
    // Using a question approach - Note: standard readline shows characters in plain text.
    // For a simple local tool, this is usually acceptable, but we can warn the user.
    rl.question('Enter the password to hash (will be visible as you type): ', (answer) => {
        rl.close();
        generateHash(answer);
    });
}
