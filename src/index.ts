import zlib from 'zlib';
import {
    Compression,
    PMTiles,
    RangeResponse,
    ResolvedValueCache,
    Source,
} from 'pmtiles';

import { labels, noLabels } from 'protomaps-themes-base';

export const nativeDecompress = async (
    buf: ArrayBuffer,
    compression: Compression
): Promise<ArrayBuffer> => {
    switch (compression) {
        case Compression.None:
        case Compression.Unknown:
            return Promise.resolve(buf);
        case Compression.Gzip: {
            return Promise.resolve(zlib.gunzipSync(buf));
        }
        default:
        // no default
    }

    throw Error('Compression method not supported');
};

export class S3Source implements Source {
    private archivName: string;

    constructor(archivName: string) {
        this.archivName = archivName;
    }

    getKey(): string {
        return this.archivName;
    }

    async getBytes(offset: number, length: number): Promise<RangeResponse> {
        await Promise.resolve();
        return {
            data: new ArrayBuffer(5),
            etag: `${this.getKey()}+etag+${offset}+${length}`,
            expires: '50',
            cacheControl: undefined,
        };
    }
}

export const doWhatever = async (
    archive: string,
    z: number,
    x: number,
    y: number
): Promise<ArrayBuffer | null> => {
    const source = new S3Source(archive);
    const cache = new ResolvedValueCache(100, true, nativeDecompress);
    const p = new PMTiles(source, cache, nativeDecompress);

    const tile = await p.getZxy(z, x, y);
    if (!tile) {
        return null;
    }
    const { data } = tile;
    if (!data) {
        return null;
    }

    return data;
};

interface StyleSource {
    type: string;
    tiles: string[];
    attribution: string;
    maxzoom: number;
}

const getSource = (version: string): Record<string, StyleSource> => ({
    basemap: {
        type: 'vector',
        tiles: [`https://xzy.com/tiles/${version}/{z}/{x}/{y}.pbf`],
        attribution:
            '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxzoom: 15,
    },
});

export const styleWhatever = (style: string, version: string) => {
    return {
        version: 8,
        layers: [...noLabels('basemap', style), ...labels('basemap', style)],
        glyphs: 'https://xzy.com/static/fonts/{fontstack}/{range}.pbf',
        sources: {
            ...getSource(version),
        },
    };
};
