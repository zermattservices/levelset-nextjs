import * as React from "react";

export interface PEARubricProps {
  className?: string;
}

export function PEARubric({ className = "" }: PEARubricProps) {
  return (
    <div className={`pea-rubric ${className}`} data-plasmic-name="pea-rubric">
      <table className="rubric-table" data-plasmic-name="rubric-table">
        <thead>
          <tr>
            <th className="rubric-title">Rating Scale</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="rubric-red">Not Yet = 1.0 – 1.49</td>
          </tr>
          <tr>
            <td className="rubric-yellow">On the Rise = 1.50 – 2.74</td>
          </tr>
          <tr>
            <td className="rubric-green">Crushing It = 2.75 – 3.0</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

