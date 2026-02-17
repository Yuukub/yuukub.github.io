import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const activeApi = path.join(process.cwd(), 'src/app/api');
const hiddenApi = path.join(process.cwd(), 'src/app/_api');
const activeKeystatic = path.join(process.cwd(), 'src/app/keystatic');
const hiddenKeystatic = path.join(process.cwd(), 'src/app/_keystatic');

function rename(src, dest) {
    if (fs.existsSync(src)) {
        fs.renameSync(src, dest);
        console.log(`Temporarily moved ${src} to ${dest}`);
        return true;
    }
    return false;
}

const apiMoved = rename(activeApi, hiddenApi);
const keystaticMoved = rename(activeKeystatic, hiddenKeystatic);

try {
    console.log('Running next build with webpack...');
    execSync('next build --webpack', { stdio: 'inherit' });
} catch (error) {
    console.error('Build failed!');
    // Don't exit here, let finally block run
    process.exitCode = 1;
} finally {
    // Restore folders
    if (apiMoved) rename(hiddenApi, activeApi);
    if (keystaticMoved) rename(hiddenKeystatic, activeKeystatic);
    console.log('Restored CMS routes.');
}
