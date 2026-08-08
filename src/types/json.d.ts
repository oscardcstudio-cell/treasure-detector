/**
 * Type declarations for JSON imports
 */

declare module '*/zone.json' {
  const content: {
    name: string;
    insee: string;
    center: [number, number];
    _notes_center: string;
    defaultZoom: number;
    bbox: [number, number, number, number];
    _notes_bbox: string;
  };
  export default content;
}

declare module '*/scoring.json' {
  const content: Record<string, unknown>;
  export default content;
}

declare module '*/presets.json' {
  const content: Record<string, unknown>;
  export default content;
}
