export default function Timeline({ steps, activeStep, activeLabel, discrepancy }) {
  return (
    <div className="workflow-timeline">
      {steps.map((step, idx) => {
        let stateClass = idx < activeStep ? 'completed' : idx === activeStep ? 'active' : '';
        if (idx === activeStep && discrepancy) stateClass = 'discrepancy';
        let desc = step.desc;
        if (idx === activeStep && activeLabel) desc = activeLabel;
        return (
          <div key={idx} className={`timeline-step ${stateClass}`}>
            <div className="timeline-bullet">{idx + 1}</div>
            <div className="timeline-content">
              <div className="timeline-title">
                <span>{step.title}</span>
                {idx === activeStep && <span className="badge badge-indigo">Active</span>}
              </div>
              <div className="timeline-desc">{desc}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
