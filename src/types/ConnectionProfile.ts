import { NetworkSettings, OrgConfig, PeerConfig } from "./FabloConfigExtended";

interface ConnectionProfile {
  name: string;
  description: string;
  version: string;
  client: Client;
  organizations: { [key: string]: Organization };
  peers: { [key: string]: Peer };
  certificateAuthorities: { [key: string]: CertificateAuthority };
}

interface Client {
  organization: string;
}

interface Organization {
  mspid: string;
  peers: Array<string>;
  certificateAuthorities: Array<string>;
}

interface Peer {
  url: string;
  tlsCACerts: TlsCACerts;
  grpcOptions: { [key: string]: string };
}

interface CertificateAuthority {
  url: string;
  caName: string;
  tlsCACerts: TlsCACerts;
  httpOptions: HttpOptions;
}

interface TlsCACerts {
  path: string;
}

interface HttpOptions {
  verify: boolean;
}

function createPeers(rootPath: string, orgs: OrgConfig[]): { [key: string]: Peer } {
  const peers: { [key: string]: Peer } = {};
  orgs.forEach((o: OrgConfig) => {
    o.anchorPeers.forEach((p: PeerConfig) => {
      peers[p.address] = {
        url: `grpcs://localhost:${p.port}`,
        tlsCACerts: {
          path: `${rootPath}/fablo-target/fabric-config/crypto-config/peerOrganizations/${o.domain}/peers/${p.address}/tls/ca.crt`,
        },
        grpcOptions: {
          "ssl-target-name-override": p.address,
        },
      };
    });
  });
  return peers;
}

export function createConnectionProfile(
  networkName: string,
  networkSettings: NetworkSettings,
  org: OrgConfig,
  orgs: OrgConfig[],
): ConnectionProfile {
  const rootPath = networkSettings.paths.chaincodesBaseDir;
  const peers = createPeers(rootPath, orgs);
  return {
    name: `test-network-org-${networkName}`,
    description: `Connection profile for ${org.name} in Fablo network ${networkName}`,
    version: "1.0.0",
    client: {
      organization: org.name,
    },
    organizations: {
      [org.name]: {
        mspid: org.mspName,
        peers: Object.keys(peers),
        certificateAuthorities: [org.ca.address],
      },
    },
    peers: peers,
    certificateAuthorities: {
      [org.ca.address]: {
        url: `http://localhost:${org.ca.exposePort}`,
        caName: org.ca.address,
        tlsCACerts: {
          path: `${rootPath}/fablo-target/fabric-config/crypto-config/peerOrganizations/${org.domain}/ca/${org.ca.address}-cert.pem`,
        },
        httpOptions: {
          verify: false,
        },
      },
    },
  };
}
