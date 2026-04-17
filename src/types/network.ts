/**
 * Interconnect specifications database.
 */

export interface InterconnectSpec {
  id: string;
  name: string;
  bandwidthGBs: number;    // per GPU/link, GB/s
  latencyUs: number;       // microseconds
  topology: 'intra-node' | 'inter-node';
  notes?: string;
}

export const INTERCONNECT_DB: InterconnectSpec[] = [
  {
    id: 'pcie-gen4',
    name: 'PCIe Gen4 x16',
    bandwidthGBs: 32,
    latencyUs: 2,
    topology: 'intra-node',
    notes: '32 GB/s bidirectional',
  },
  {
    id: 'pcie-gen5',
    name: 'PCIe Gen5 x16',
    bandwidthGBs: 64,
    latencyUs: 1.5,
    topology: 'intra-node',
    notes: '64 GB/s bidirectional',
  },
  {
    id: 'nvlink3',
    name: 'NVLink 3 (A100)',
    bandwidthGBs: 600,
    latencyUs: 0.5,
    topology: 'intra-node',
    notes: '600 GB/s per GPU, 12 links × 50 GB/s',
  },
  {
    id: 'nvlink4',
    name: 'NVLink 4 (H100/H200)',
    bandwidthGBs: 900,
    latencyUs: 0.5,
    topology: 'intra-node',
    notes: '900 GB/s per GPU, 18 links × 50 GB/s',
  },
  {
    id: 'nvlink5',
    name: 'NVLink 5 (B200/GB200)',
    bandwidthGBs: 1800,
    latencyUs: 0.3,
    topology: 'intra-node',
    notes: '1.8 TB/s per GPU',
  },
  {
    id: 'ib-hdr',
    name: 'InfiniBand HDR',
    bandwidthGBs: 25,
    latencyUs: 1,
    topology: 'inter-node',
    notes: '200 Gb/s ~25 GB/s per port',
  },
  {
    id: 'ib-ndr',
    name: 'InfiniBand NDR',
    bandwidthGBs: 50,
    latencyUs: 0.6,
    topology: 'inter-node',
    notes: '400 Gb/s ~50 GB/s per port',
  },
  {
    id: 'ib-xdr',
    name: 'InfiniBand XDR',
    bandwidthGBs: 100,
    latencyUs: 0.5,
    topology: 'inter-node',
    notes: '800 Gb/s ~100 GB/s per port',
  },
  {
    id: 'rocev2',
    name: 'RoCEv2 (Spectrum-X)',
    bandwidthGBs: 50,
    latencyUs: 2,
    topology: 'inter-node',
    notes: '400/800 Gb/s, 1-3µs latency',
  },
  {
    id: 'aws-efa',
    name: 'AWS EFA',
    bandwidthGBs: 400,
    latencyUs: 1.5,
    topology: 'inter-node',
    notes: '3,200 Gbps aggregate on p5 instances',
  },
  {
    id: 'tpu-ici',
    name: 'Google TPU ICI',
    bandwidthGBs: 600,
    latencyUs: 0.5,
    topology: 'intra-node',
    notes: '4,800 Gb/s/chip on v5p',
  },
];
