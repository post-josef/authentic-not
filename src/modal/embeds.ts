export type EmbedProvider = "youtube" | "vimeo" | "generic";

export interface EmbedOptions {
    provider?: EmbedProvider;
    videoId?: string;
    src?: string;
    autoplay?: boolean;
    muted?: boolean;
    params?: Record<string, string>;
}

function withParams(base: string, params: Record<string, string>): string {
    const url = new URL(base);
    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
    }
    return url.toString();
}

export function buildEmbedSrc(options: EmbedOptions): string {
    const provider = options.provider ?? "generic";
    const autoplay = options.autoplay ?? false;
    const muted = options.muted ?? autoplay;
    const extra = options.params ?? {};

    if (provider === "youtube") {
        const id = options.videoId;
        if (!id && options.src) return options.src;
        if (!id) throw new Error("YouTube embed requires videoId or src");
        return withParams(`https://www.youtube.com/embed/${id}`, {
            autoplay: autoplay ? "1" : "0",
            mute: muted ? "1" : "0",
            rel: "0",
            ...extra,
        });
    }

    if (provider === "vimeo") {
        const id = options.videoId;
        if (!id && options.src) return options.src;
        if (!id) throw new Error("Vimeo embed requires videoId or src");
        return withParams(`https://player.vimeo.com/video/${id}`, {
            autoplay: autoplay ? "1" : "0",
            muted: muted ? "1" : "0",
            autopause: "0",
            ...extra,
        });
    }

    if (!options.src) throw new Error("Generic embed requires src");
    return options.src;
}
