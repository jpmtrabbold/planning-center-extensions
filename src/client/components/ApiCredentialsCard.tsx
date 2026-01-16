type ApiCredentialsCardProps = {
  appId: string;
  appSecret: string;
  rememberCredentials: boolean;
  onAppIdChange: (value: string) => void;
  onAppSecretChange: (value: string) => void;
  onRememberChange: (value: boolean) => void;
};

export const ApiCredentialsCard = ({
  appId,
  appSecret,
  rememberCredentials,
  onAppIdChange,
  onAppSecretChange,
  onRememberChange,
}: ApiCredentialsCardProps) => (
  <div className="card">
    <h2>1) API Credentials</h2>
    <div className="grid">
      <div>
        <label htmlFor="app-id">Application ID</label>
        <input
          id="app-id"
          type="text"
          placeholder="App ID"
          value={appId}
          onChange={(event) => onAppIdChange(event.target.value)}
        />
      </div>
      <div>
        <label htmlFor="app-secret">Application Secret</label>
        <input
          id="app-secret"
          type="password"
          placeholder="Secret"
          value={appSecret}
          onChange={(event) => onAppSecretChange(event.target.value)}
        />
      </div>
    </div>
    <div style={{ marginTop: '12px' }}>
      <label>
        <input
          id="remember-credentials"
          type="checkbox"
          checked={rememberCredentials}
          onChange={(event) => onRememberChange(event.target.checked)}
        />
        Remember credentials on this device
      </label>
    </div>
    <p className="muted">
      These are used only in your browser session to call the Planning Center API. Use a separate
      personal app credential if possible. If you choose to remember them, they are stored locally
      in this browser.
    </p>
  </div>
);
