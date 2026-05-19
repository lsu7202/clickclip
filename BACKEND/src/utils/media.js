const { execFile } = require('child_process');

function probeVideoDuration(filePath) {
  return new Promise((resolve, reject) => {
    execFile(
      'ffprobe',
      [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        filePath,
      ],
      (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }

        const duration = Number.parseFloat(String(stdout).trim());
        if (Number.isNaN(duration)) {
          reject(new Error('Failed to parse video duration'));
          return;
        }

        resolve(duration);
      }
    );
  });
}

module.exports = {
  probeVideoDuration,
};