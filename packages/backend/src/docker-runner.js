import Docker from 'dockerode';

const docker = new Docker(); // Automatically connects to local Docker socket (/var/run/docker.sock or Windows named pipe)

// Project type → Docker image mapping
const IMAGE_MAP = {
  node: 'node:20-alpine',
  python: 'python:3.12-slim',
  java: 'openjdk:17-slim',
  go: 'golang:1.22-alpine',
};

// Track active container per socket session: Map<socketId, Container>
const activeContainers = new Map();

/**
 * Detects project type by looking for marker files in project root.
 * @param {string[]} files
 * @returns {'node' | 'python' | 'java' | 'go'}
 */
export function detectProjectType(files = []) {
  if (files.includes('package.json')) return 'node';
  if (files.includes('requirements.txt') || files.includes('main.py') || files.includes('app.py')) return 'python';
  if (files.includes('pom.xml') || files.includes('build.gradle') || files.includes('build.gradle.kts')) return 'java';
  if (files.includes('go.mod')) return 'go';
  return 'node'; // default fallback
}

/**
 * Starts (or reuses) a Docker container for this socket session's project.
 * @param {string} socketId
 * @param {string} projectPath - Host directory path to mount into container
 * @param {string[]} fileList - Top-level files in project directory
 */
export async function ensureProjectContainer(socketId, projectPath, fileList = []) {
  if (activeContainers.has(socketId)) {
    return activeContainers.get(socketId);
  }

  const type = detectProjectType(fileList);
  const image = IMAGE_MAP[type] || 'node:20-alpine';

  // Ensure Docker image exists locally (pulls once, cached afterward)
  await new Promise((resolve, reject) => {
    docker.pull(image, (err, stream) => {
      if (err) return reject(err);
      docker.modem.followProgress(stream, (err) => (err ? reject(err) : resolve()));
    });
  });

  const container = await docker.createContainer({
    Image: image,
    Cmd: ['sh'],
    Tty: true,
    OpenStdin: true,
    WorkingDir: '/app',
    HostConfig: {
      Binds: [`${projectPath}:/app`],
      Memory: 512 * 1024 * 1024, // 512MB RAM limit
      NanoCpus: 1_000_000_000, // 1 CPU core limit
      AutoRemove: true,
      PortBindings: {
        '3000/tcp': [{ HostPort: '0' }], // Maps port 3000 to random free host port
      },
    },
    ExposedPorts: {
      '3000/tcp': {},
    },
  });

  await container.start();
  activeContainers.set(socketId, container);
  return container;
}

/**
 * Executes a command inside the session's active container and streams output.
 * @param {string} socketId
 * @param {string} command - e.g. "npm install", "npm start"
 * @param {(chunk: string) => void} onData - Stream output handler
 */
export async function execInContainer(socketId, command, onData) {
  const container = activeContainers.get(socketId);
  if (!container) {
    throw new Error('No active container for this session. Start project first.');
  }

  const exec = await container.exec({
    Cmd: ['sh', '-c', command],
    AttachStdout: true,
    AttachStderr: true,
  });

  const stream = await exec.start({ hijack: true, stdin: false });
  return new Promise((resolve) => {
    container.modem.demuxStream(
      stream,
      { write: (chunk) => onData(chunk.toString()) }, // stdout
      { write: (chunk) => onData(chunk.toString()) }  // stderr
    );
    stream.on('end', resolve);
  });
}

/**
 * Cleans up the Docker container when user disconnects or stops session.
 * @param {string} socketId
 */
export async function stopProjectContainer(socketId) {
  const container = activeContainers.get(socketId);
  if (container) {
    try {
      await container.stop();
    } catch (_) {
      /* Container already stopped or removed */
    }
    activeContainers.delete(socketId);
  }
}

/**
 * Returns host port mapped to container port 3000 for preview URL.
 * @param {string} socketId
 * @returns {Promise<string | null>}
 */
export async function getContainerPort(socketId) {
  const container = activeContainers.get(socketId);
  if (!container) return null;
  const info = await container.inspect();
  return info.NetworkSettings.Ports['3000/tcp']?.[0]?.HostPort || null;
}
