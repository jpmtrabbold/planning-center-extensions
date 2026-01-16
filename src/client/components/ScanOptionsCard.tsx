type ScanOptionsCardProps = {
  serviceTypeId: string;
  pageSize: string;
  scoreThreshold: string;
  scoreDelta: string;
  isScanning: boolean;
  serviceTypes: { id: string; name: string }[];
  serviceTypesState: 'idle' | 'loading' | 'ready' | 'error';
  isDisabled?: boolean;
  onServiceTypeChange: (value: string) => void;
  onPageSizeChange: (value: string) => void;
  onScoreThresholdChange: (value: string) => void;
  onScoreDeltaChange: (value: string) => void;
  onScan: () => void;
  onClear: () => void;
};

export const ScanOptionsCard = ({
  serviceTypeId,
  pageSize,
  scoreThreshold,
  scoreDelta,
  isScanning,
  serviceTypes,
  serviceTypesState,
  isDisabled = false,
  onServiceTypeChange,
  onPageSizeChange,
  onScoreThresholdChange,
  onScoreDeltaChange,
  onScan,
  onClear,
}: ScanOptionsCardProps) => (
  <div className="card">
    <h2>2) Scan Options</h2>
    <div className="grid">
      <div>
        <label htmlFor="service-type-id">Service Type</label>
        <input
          id="service-type-id"
          type="text"
          list="service-type-options"
          placeholder="e.g. Sunday Worship (123456)"
          value={serviceTypeId}
          onChange={(event) => onServiceTypeChange(event.target.value)}
          disabled={isDisabled}
        />
        <datalist id="service-type-options">
          {serviceTypes.map((serviceType) => (
            <option
              key={serviceType.id}
              value={`${serviceType.name} (${serviceType.id})`}
              label={`${serviceType.name} (${serviceType.id})`}
            />
          ))}
        </datalist>
        {serviceTypesState === 'loading' ? (
          <p className="helper">Loading service types...</p>
        ) : serviceTypesState === 'error' ? (
          <p className="helper error">Unable to load service types. Enter an ID manually.</p>
        ) : null}
      </div>
      <div>
        <label htmlFor="page-size">Plans to scan</label>
        <input
          id="page-size"
          type="number"
          min="1"
          value={pageSize}
          onChange={(event) => onPageSizeChange(event.target.value)}
          disabled={isDisabled}
        />
      </div>
      <div>
        <label htmlFor="score-threshold">Match threshold</label>
        <input
          id="score-threshold"
          type="number"
          min="0"
          max="1"
          step="0.05"
          value={scoreThreshold}
          onChange={(event) => onScoreThresholdChange(event.target.value)}
          disabled={isDisabled}
        />
      </div>
      <div>
        <label htmlFor="score-delta">Match delta</label>
        <input
          id="score-delta"
          type="number"
          min="0"
          max="1"
          step="0.01"
          value={scoreDelta}
          onChange={(event) => onScoreDeltaChange(event.target.value)}
          disabled={isDisabled}
        />
      </div>
    </div>
    <div className="actions" style={{ marginTop: '12px' }}>
      <button onClick={onScan} disabled={isScanning || isDisabled}>
        {isScanning ? 'Scanning...' : 'Scan for unlinked songs'}
      </button>
      <button className="secondary" onClick={onClear} disabled={isDisabled}>
        Clear results
      </button>
    </div>
    <p className="muted">
      The scanner will load the most recent plans for this service type and find items without a
      linked song. Then it will compare them to your Planning Center Songs list.
    </p>
  </div>
);
