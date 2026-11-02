import { pathToFileURL } from 'node:url';

const serverRoot = 'E:/pet/tools/construct3-mcp';
const sdkRoot = `${serverRoot}/node_modules/@modelcontextprotocol/sdk/dist/esm`;
const { Client } = await import(pathToFileURL(`${sdkRoot}/client/index.js`));
const { StdioClientTransport } = await import(pathToFileURL(`${sdkRoot}/client/stdio.js`));

export async function withConstruct(action, project = 'E:/pet/match_3_construct_3') {
  const client = new Client({ name: 'gem-mine-tools', version: '2.0.0' });
  const transport = new StdioClientTransport({ command: process.execPath, args: [`${serverRoot}/dist/index.js`, project], stderr: 'inherit' });
  try {
    await client.connect(transport);
    const call = async (name, args = {}) => {
      const result = await client.callTool({ name, arguments: args });
      const text = result.content.filter(part => part.type === 'text').map(part => part.text).join('\n');
      if (result.isError) throw new Error(`${name}: ${text}`);
      try { return JSON.parse(text); } catch { return text; }
    };
    return await action({ client, call });
  } finally {
    await client.close();
  }
}
