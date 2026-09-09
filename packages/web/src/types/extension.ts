export interface Extension {
  id: string;
  name: string;
  publisher: string;
  verified: boolean;
  description: string;
  icon: string; // emoji stand-in for icon image
  iconBg: string; // background color behind icon
  version: string;
  rating: number;
  reviewCount: number;
  downloads: string;
  category: string;
}

export interface EditorExtensionRuntime {
  id: string;
  activate: (editorApi: any) => void | Promise<void>;
  deactivate: (editorApi: any) => void | Promise<void>;
}
