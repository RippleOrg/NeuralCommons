import { getRuntimeConfig } from '../runtime';
import type { LitKeyEnvelope } from '../../types/vault';

type LitNodeClientLike = {
  connect: () => Promise<void>;
};

let litClientPromise: Promise<LitNodeClientLike> | null = null;

export function deriveDidFromAddress(address: string): string {
  return `did:pkh:eip155:${getRuntimeConfig().chainId}:${address}`;
}

function buildRecipientConditions(ownerAddress: string, recipientAddresses: string[], chain: string) {
  const addresses = Array.from(
    new Set([ownerAddress, ...recipientAddresses].map((value) => value.toLowerCase()))
  );

  return addresses.flatMap((address, index) => {
    const condition = {
      contractAddress: '',
      standardContractType: '',
      chain,
      method: '',
      parameters: [':userAddress'],
      returnValueTest: {
        comparator: '=',
        value: address,
      },
    };

    return index === addresses.length - 1
      ? [condition]
      : [condition, { operator: 'or' }];
  });
}

async function getLitClient(): Promise<LitNodeClientLike> {
  if (!litClientPromise) {
    litClientPromise = (async () => {
      const pkg = '@lit-protocol/lit-node-client';
      const module = (await import(/* @vite-ignore */ pkg)) as {
        LitNodeClient: new (input: { litNetwork: string; debug: boolean }) => LitNodeClientLike;
      };
      const config = getRuntimeConfig();
      const client = new module.LitNodeClient({
        litNetwork: config.litNetwork,
        debug: false,
      });
      await client.connect();
      return client;
    })();
  }

  return litClientPromise;
}

export async function sealVaultKeyWithLit(input: {
  ownerAddress: string;
  recipientAddresses: string[];
  exportedKeyMaterial: string;
}): Promise<LitKeyEnvelope | undefined> {
  const config = getRuntimeConfig();

  if (!input.ownerAddress || input.recipientAddresses.length === 0) {
    return undefined;
  }

  try {
    const encryptionPkg = '@lit-protocol/encryption';
    const { encryptString } = (await import(/* @vite-ignore */ encryptionPkg)) as {
      encryptString: (
        args: {
          accessControlConditions: Array<Record<string, unknown>>;
          dataToEncrypt: string;
        },
        client: LitNodeClientLike
      ) => Promise<{ ciphertext: string; dataToEncryptHash: string }>;
    };

    const accessControlConditions = buildRecipientConditions(
      input.ownerAddress,
      input.recipientAddresses,
      config.litChain
    );

    const client = await getLitClient();
    const encrypted = await encryptString(
      {
        accessControlConditions,
        dataToEncrypt: input.exportedKeyMaterial,
      },
      client
    );

    return {
      ciphertext: encrypted.ciphertext,
      dataToEncryptHash: encrypted.dataToEncryptHash,
      accessControlConditions,
      chain: config.litChain,
      litNetwork: config.litNetwork,
    };
  } catch {
    return undefined;
  }
}
