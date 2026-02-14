import * as React from "react";

export interface PEARubricProps {
  className?: string;
  yellowThreshold?: number;
  greenThreshold?: number;
}

export function PEARubric({ className = "", yellowThreshold = 1.75, greenThreshold = 2.75 }: PEARubricProps) {
  const notYetEnd = (yellowThreshold - 0.01).toFixed(2);
  const onTheRiseStart = yellowThreshold.toFixed(2);
  const onTheRiseEnd = (greenThreshold - 0.01).toFixed(2);
  const crushingItStart = greenThreshold.toFixed(2);

  return (
    <div className={`pea-rubric ${className}`} data-plasmic-name="pea-rubric">
      <table className="rubric-table" data-plasmic-name="rubric-table">
        <tbody>
          <tr>
            <td className="rubric-red">Not Yet = 1.0 – {notYetEnd}</td>
          </tr>
          <tr>
            <td className="rubric-yellow">On the Rise = {onTheRiseStart} – {onTheRiseEnd}</td>
          </tr>
          <tr>
            <td className="rubric-green">Crushing It = {crushingItStart} – 3.0</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

