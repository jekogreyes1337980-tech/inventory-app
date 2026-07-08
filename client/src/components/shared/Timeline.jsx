export default function Timeline({ steps, activeStep, activeLabel, discrepancy, handledBy = {} }) {
  return (
    <div className="workflow-timeline">
      {steps.map((step, idx) => {
        let stateClass = idx < activeStep ? 'completed' : idx === activeStep ? 'active' : '';
        if (idx === activeStep && discrepancy) stateClass = 'discrepancy';
        let desc = step.desc;
        if (idx === activeStep && activeLabel) desc = activeLabel;
        const handler = step.handledKey && handledBy[step.handledKey];
        return (
          <div key={idx} className={`timeline-step ${stateClass}`}>
            <div className="timeline-bullet">{idx + 1}</div>
            <div className="timeline-content">
              <div className="timeline-title">
                <span>{step.title}</span>
                {idx === activeStep && <span className="badge badge-indigo" style={{ fontSize: '0.65rem' }}>Active</span>}
              </div>
              <div className="timeline-desc">{desc}</div>
              {handler && (
                <div className="timeline-meta">
                  <span style={{ color: 'var(--success)' }}>&#10003; {handledBy[step.handledKey]}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
