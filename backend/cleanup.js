const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'config.env') });

mongoose.connect(process.env.DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('DB connection successful for cleanup!'));

const cleanup = async () => {
    try {
        // Delete all existing users
        await mongoose.connection.collection('users').deleteMany({});
        console.log('All users have been deleted successfully');
        process.exit();
    } catch (err) {
        console.error('Error during cleanup:', err);
        process.exit(1);
    }
}

cleanup();
