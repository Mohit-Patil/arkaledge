import React, { useState } from 'react';

export interface ProjectLauncherProps {
  onExecute: (specFile: string, configFile: string, outputDir: string) => void;
  isRunning?: boolean;
}

const ASCII_HEADER = `
  ____              _   _
 |  _ \\  ___  ___  | \\ | | _____      _____
 | | | |/ _ \\/ __| |  \\| |/ _ \\ \\ /\\ / / __|
 | |_| |  __/\\__ \\ | |\\  |  __/\\ V  V /\\__ \\
 |____/ \\___||___/ |_| \\_|\\___| \\_/\\_/ |___/

     _     ___        __
    | |   |_ _|      / _| ___  _ __   ___  _ __  ___
 _  | |    | |  ____| |_ / _ \\| '_ \\ / _ \\| '_ \\/ __|
| |_| |   | | |____|  _| (_) | |_) | (_) | | | \\__ \\
 \\___/   |___|      |_|  \\___/| .__/ \\___/|_| |_|___/
                                |_|
`;

export const ProjectLauncher: React.FC<ProjectLauncherProps> = ({
  onExecute,
  isRunning = false,
}) => {
  const [specFile, setSpecFile] = useState('');
  const [configFile, setConfigFile] = useState('');
  const [outputDir, setOutputDir] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (specFile && configFile && outputDir) {
      onExecute(specFile, configFile, outputDir);
    }
  };

  return (
    <div className="panel project-launcher">
      <div className="ascii-header">
        <pre>{ASCII_HEADER}</pre>
      </div>

      <form onSubmit={handleSubmit} className="launcher-form">
        <div className="input-group">
          <label htmlFor="spec-file" className="input-label">
            [SPEC_FILE]
          </label>
          <input
            id="spec-file"
            type="text"
            className="input-field"
            placeholder="path/to/spec.md"
            value={specFile}
            onChange={(e) => setSpecFile(e.target.value)}
            disabled={isRunning}
          />
        </div>

        <div className="input-group">
          <label htmlFor="config-file" className="input-label">
            [CONFIG_FILE]
          </label>
          <input
            id="config-file"
            type="text"
            className="input-field"
            placeholder="path/to/config.yaml"
            value={configFile}
            onChange={(e) => setConfigFile(e.target.value)}
            disabled={isRunning}
          />
        </div>

        <div className="input-group">
          <label htmlFor="output-dir" className="input-label">
            [OUTPUT_DIR]
          </label>
          <input
            id="output-dir"
            type="text"
            className="input-field"
            placeholder="path/to/output"
            value={outputDir}
            onChange={(e) => setOutputDir(e.target.value)}
            disabled={isRunning}
          />
        </div>

        <button
          type="submit"
          className={`btn btn-execute ${isRunning ? 'running' : ''}`}
          disabled={isRunning || !specFile || !configFile || !outputDir}
        >
          {isRunning ? (
            <>
              <span className="spinner">*</span> RUNNING...
            </>
          ) : (
            <>EXECUTE:&gt; run</>
          )}
        </button>
      </form>
    </div>
  );
};

export default ProjectLauncher;
