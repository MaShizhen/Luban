import { createSVGElement } from '../../element-utils';
import { Mode, pointRadius, pointSize, pointWeight, TCoordinate, ThemeColor } from './constants';
import { ControlPoint, EndPoint } from './Point';

const minimumSpacing = 0.1;

class OperationGroup {
    public mode: Mode;

    public controlsArray: (ControlPoint | EndPoint)[] = [];

    private lastControlsArray: (ControlPoint | EndPoint)[] = [];

    public controlPoints: SVGGElement;

    private connectLines: SVGElement;

    private previewLine: SVGPathElement

    public onDrawgraph: (points: TCoordinate[]) => void;

    private scale: number;

    constructor(container: SVGGElement, scale: number) {
        this.scale = scale;

        this.connectLines = createSVGElement({
            element: 'g',
            attr: {
                id: 'connectLines'
            }
        });

        this.previewLine = createSVGElement({
            element: 'path',
            attr: {
                'stroke-width': pointWeight / this.scale,
                id: 'previewLine',
                fill: 'transparent',
                stroke: ThemeColor
            }
        });

        this.controlPoints = createSVGElement({
            element: 'g',
            attr: {
                id: 'controlPoints'
            }
        });

        container.append(this.connectLines);
        container.append(this.previewLine);
        container.append(this.controlPoints);
    }

    private createLine(a: TCoordinate, b: TCoordinate) {
        return createSVGElement({
            element: 'path',
            attr: {
                'stroke-width': pointWeight / this.scale,
                d: `M ${a.join(' ')} L ${b.join(' ')} Z`,
                fill: '',
                stroke: ThemeColor
            }
        });
    }

    private createPoint(point: ControlPoint | EndPoint): SVGRectElement {
        const attr = {
            fill: '',
            'fill-opacity': 1,
            width: pointSize / this.scale,
            height: pointSize / this.scale,
            x: point.x - (pointRadius / this.scale),
            y: point.y - (pointRadius / this.scale),
            stroke: ThemeColor,
            'stroke-width': pointWeight / this.scale,
            rx: '0',
            ry: '0',
            'pointer-events': 'all',
            'is-controls': true
        };
        if (point instanceof EndPoint) {
            attr.rx = (pointRadius / this.scale).toString();
            attr.ry = (pointRadius / this.scale).toString();
        }
        return createSVGElement({
            element: 'rect',
            attr
        });
    }

    private renderCurve(curveData: [TCoordinate, TCoordinate, TCoordinate]) {
        const d = `M ${curveData[0].join(' ')} Q ${curveData[1].join(' ')}, ${curveData[2].join(' ')}`;
        this.previewLine.setAttribute('visibility', 'visible');
        this.previewLine.setAttribute('d', d);
    }

    private renderControlPoints(controlPointData: ControlPoint[]) {
        controlPointData.forEach((item, index) => {
            const elem = this.controlPoints.children[index];
            if (elem) {
                elem.setAttribute('x', (item.x - pointRadius / this.scale).toString());
                elem.setAttribute('y', (item.y - pointRadius / this.scale).toString());
                elem.setAttribute('rx', '0');
                elem.setAttribute('ry', '0');
                elem.setAttribute('visibility', 'visible');
            } else {
                this.controlPoints.append(this.createPoint(item));
            }
        });
        Array(this.controlPoints.childElementCount - controlPointData.length).fill('').forEach((_, index) => {
            this.controlPoints.children[this.controlPoints.childElementCount - index - 1].setAttribute('visibility', 'hidden');
        });
    }

    private renderEndPoints() {
        const firstEndPoint = this.controlsArray[0] as EndPoint;
        const elem = this.controlPoints.firstElementChild;
        if (elem) {
            elem.setAttribute('x', (firstEndPoint.x - pointRadius / this.scale).toString());
            elem.setAttribute('y', (firstEndPoint.y - pointRadius / this.scale).toString());
            elem.setAttribute('rx', (pointRadius / this.scale).toString());
            elem.setAttribute('ry', (pointRadius / this.scale).toString());
            elem.setAttribute('visibility', 'visible');

            Array.from(this.controlPoints.children).forEach((child, index) => {
                if (index !== 0) {
                    child.setAttribute('visibility', 'hidden');
                }
            });
        } else {
            this.controlPoints.append(this.createPoint(firstEndPoint));
        }
    }

    private renderControlLines(lineEndPoints: Array<[TCoordinate, TCoordinate]>) {
        lineEndPoints.forEach((item, index) => {
            const elem = this.connectLines.children[index];
            if (elem) {
                elem.setAttribute('d', `M ${item[0].join(' ')} L ${item[1].join(' ')} Z`);
                elem.setAttribute('visibility', 'visible');
            } else {
                this.connectLines.append(this.createLine(item[0], item[1]));
            }
        });
        Array(this.connectLines.childElementCount - lineEndPoints.length).fill('').forEach((_, index) => {
            this.connectLines.children[this.connectLines.childElementCount - index - 1].setAttribute('visibility', 'hidden');
        });
    }

    private updateControlsLine(controlsArray: (ControlPoint | EndPoint)[], lastControlsArray?: (ControlPoint | EndPoint)[]) {
        if (controlsArray.length === 0) {
            return;
        }
        const controlPointData = [];
        const curveData = [] as unknown as [TCoordinate, TCoordinate, TCoordinate];
        const lineEndPoints = controlsArray.reduce((p, item, index) => {
            // render end points
            if (item instanceof ControlPoint) {
                controlPointData.push(item);
                const a = controlsArray[index - 1];
                const b = controlsArray[index + 1];
                if (this.mode === Mode.DRAW && a && b) {
                    curveData.push([a.x, a.y], [item.x, item.y], [b.x, b.y]);
                }
            }
            // generate line's endpoints
            const next = controlsArray[index + 1];
            if (next && !(item instanceof ControlPoint && next instanceof ControlPoint)) {
                p.push([
                    [item.x, item.y], [next.x, next.y]
                ]);
            }
            return p;
        }, []) as Array<[[number, number], [number, number]]>;

        lastControlsArray && lastControlsArray.forEach((item, index) => {
            // generate line's endpoints
            const next = lastControlsArray[index + 1];
            if (next && !(item instanceof ControlPoint && next instanceof ControlPoint)) {
                lineEndPoints.push([
                    [item.x, item.y], [next.x, next.y]
                ]);
            }
            if (item instanceof ControlPoint) {
                controlPointData.push(item);
            }
        });

        lineEndPoints.length > 0 && this.renderControlLines(lineEndPoints);
        if (controlPointData.length > 0) {
            this.renderControlPoints(controlPointData);
        } else {
            this.renderEndPoints();
        }
        curveData.length > 0 && this.renderCurve(curveData);
    }

    private setControlsArray(point: EndPoint | ControlPoint) {
        if (this.controlsArray.length > 0 && point instanceof EndPoint) {
            // emit draw line
            this.onDrawgraph && this.onDrawgraph([...this.controlsArray, point].map((item) => {
                return [item.x, item.y];
            }));
            this.lastControlsArray = [...this.controlsArray, point];
            this.clearOperation();
            this.controlsArray = [point];
        } else {
            this.controlsArray.push(point);
        }

        this.updateControlsLine(this.controlsArray);
    }

    private parseLine(elem: SVGPathElement): Array<(EndPoint|ControlPoint)> {
        const controlsArray = [];
        const d = elem.getAttribute('d');
        const res: string[] = d.match(/\d+\.*\d*/g);
        const points: Array<TCoordinate> = [];
        if (res) {
            for (let index = 0; index < res.length; index += 2) {
                points.push([
                    Number(res[index]),
                    Number(res[index + 1])
                ]);
            }
        }
        points.forEach((item, index) => {
            if (index === 0 || index === points.length - 1) {
                controlsArray.push(new EndPoint(...item));
            } else {
                controlsArray.push(new ControlPoint(...item));
            }
        });
        return controlsArray;
    }

    public setControlPoint(x: number, y: number) {
        if (this.controlsArray.length === 0) {
            return;
        }
        const lasetEndPoint = this.controlsArray[this.controlsArray.length - 1];
        if (Math.abs(lasetEndPoint.x - x) <= minimumSpacing && Math.abs(lasetEndPoint.y - y) <= minimumSpacing) {
            return;
        }
        const point = new ControlPoint(x, y);

        this.setControlsArray(point);
    }

    public setEndPoint(x: number, y: number) {
        if (this.controlsArray.length > 0) {
            const lasetPoint = this.controlsArray[this.controlsArray.length - 1];
            if (lasetPoint.x === x && lasetPoint.y === y) {
                return;
            }
            if (lasetPoint instanceof ControlPoint) {
                const lasetEndPoint = this.controlsArray[this.controlsArray.length - 2];
                if (lasetEndPoint.x === x && lasetEndPoint.y === y) {
                    return;
                }
            }
        }
        const point = new EndPoint(x, y);

        this.setControlsArray(point);
    }

    public updateOperation(elem: SVGPathElement) {
        this.controlsArray = this.parseLine(elem);

        this.updateControlsLine(this.controlsArray);
    }

    private calcSymmetryPoint([x, y]: TCoordinate, [x1, y1]: TCoordinate): TCoordinate {
        return [2 * x1 - x, 2 * y1 - y];
    }

    public updatePrviewByCursor(cursorPoint: ControlPoint | EndPoint) {
        if (this.controlsArray.length === 0 || this.mode !== Mode.DRAW) {
            return;
        }
        const lasetEndPoint = this.controlsArray[this.controlsArray.length - 1];
        if (Math.abs(lasetEndPoint.x - cursorPoint.x) <= minimumSpacing && Math.abs(lasetEndPoint.y - cursorPoint.y) <= minimumSpacing) {
            return;
        }

        const lastControlsArray = [...this.lastControlsArray];
        if (cursorPoint instanceof ControlPoint && lastControlsArray.length > 0) {
            if (lastControlsArray.length === 2) {
                const p = this.calcSymmetryPoint([cursorPoint.x, cursorPoint.y], [lastControlsArray[1].x, lastControlsArray[1].y]);

                lastControlsArray.splice(1, 0, new ControlPoint(...p));
            } else {
                const p = this.calcSymmetryPoint([cursorPoint.x, cursorPoint.y], [lastControlsArray[2].x, lastControlsArray[2].y]);
                lastControlsArray.splice(2, 0, new ControlPoint(...p));
            }
            // const path = this.generatePath(points);
        } else {
            this.lastControlsArray = [];
        }
        this.updateControlsLine([...this.controlsArray, cursorPoint], lastControlsArray);
    }

    public clearOperation() {
        this.controlsArray = [];
        Array.from(this.controlPoints.children).forEach(elem => {
            elem.setAttribute('visibility', 'hidden');
        });
        Array.from(this.connectLines.children).forEach(elem => {
            elem.setAttribute('visibility', 'hidden');
        });
        this.previewLine.setAttribute('visibility', 'hidden');
    }

    public updateScale(scale: number) { // just change the engineer scale
        this.scale = scale;

        Array.from(this.controlPoints.children).forEach(elem => {
            elem.setAttribute('width', (pointSize / this.scale).toString());
            elem.setAttribute('height', (pointSize / this.scale).toString());
            elem.setAttribute('stroke-width', (1 / this.scale).toString());

            const rx = elem.getAttribute('rx');
            const ry = elem.getAttribute('ry');
            if (rx && ry) {
                elem.setAttribute('rx', (pointRadius / this.scale).toString());
                elem.setAttribute('ry', (pointRadius / this.scale).toString());
            }
        });

        Array.from(this.connectLines.children).forEach(elem => {
            elem.setAttribute('stroke-width', (1 / this.scale).toString());
        });

        this.previewLine.setAttribute('stroke-width', (1 / this.scale).toString());
    }
}

export default OperationGroup;
