type ScanOptionsCardProps = {
  serviceTypeId: string;
  pageSize: string;
  scoreThreshold: string;
  isScanning: boolean;
  onServiceTypeChange: (value: string) => void;
  onPageSizeChange: (value: string) => void;
  onScoreThresholdChange: (value: string) => void;
  onScan: () => void;
  onClear: () => void;
};

export const ScanOptionsCard = ({
  serviceTypeId,
  pageSize,
  scoreThreshold,
  isScanning,
  onServiceTypeChange,
  onPageSizeChange,
  onScoreThresholdChange,
  onScan,
  onClear,
}: ScanOptionsCardProps) => (
  <div className="card">
    <h2>2) Scan Options</h2>
    <div className="grid">
      <div>
        <label htmlFor="service-type-id">Service Type ID</label>
        <input
          id="service-type-id"
          type="text"
          placeholder="e.g. 123456"
          value={serviceTypeId}
          onChange={(event) => onServiceTypeChange(event.target.value)}
        />
      </div>
      <div>
        <label htmlFor="page-size">Plans to scan</label>
        <input
          id="page-size"
          type="number"
          min="1"
          max="500"
          value={pageSize}
          onChange={(event) => onPageSizeChange(event.target.value)}
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
        />
      </div>
    </div>
    <div className="actions" style={{ marginTop: '12px' }}>
      <button onClick={onScan} disabled={isScanning}>
        {isScanning ? 'Scanning...' : 'Scan for unlinked songs'}
      </button>
      <button className="secondary" onClick={onClear}>
        Clear results
      </button>
    </div>
    <p className="muted">
      The scanner will load the most recent plans for this service type and find items without a
      linked song. Then it will compare them to your Planning Center Songs list.
    </p>
  </div>
);
