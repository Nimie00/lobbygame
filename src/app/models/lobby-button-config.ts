export interface LobbyButtonConfig {
  class: string;
  label: string;
  action: () => void;
  disabled?: boolean;
  visible: boolean;
}
