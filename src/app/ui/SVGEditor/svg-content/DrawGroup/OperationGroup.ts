import { createSVGElement } from '../../element-utils';
import { Mode, pointRadius, pointSize, ThemeColor } from './constants';
import { ControlPoint, EndPoint } from './Point';

type TCoordinate = [number, number]

class OperationGroup {
    public mode: Mode;

    public controlsArray: (ControlPoint | EndPoint)[] = [];

    public controlPoints: SVGGElement;

    private connectLines: SVGElement;

    private previewLine: SVGPathElement

    public onDrawgraph

    constructor(container: SVGGElement) {
        this.connectLines = createSVGElement({
            element: 'g',
            attr: {
                id: 'connectLines'
            }
        });

        this.previewLine = createSVGElement({
            element: 'path',
            attr: {
                id: 'previewLine',
                fill: 'transparent',
                stroke: 'black'
            }
        });

        this.controlPoints = createSVGElement({
            element: 'g',
            attr: {
                id: 'controlPoints'
            }
        });

        container.parentElement.append(this.controlPoints);
        container.parentElement.append(this.connectLines);
        container.parentElement.append(this.previewLine);
    }

    private createLine(a: TCoordinate, b: TCoordinate) {
        return createSVGElement({
            element: 'path',
            attr: {
                'stroke-width': 1,
                d: `M ${a.join(' ')} L ${b.join(' ')} Z`,
                fill: 'transparent',
                stroke: ThemeColor
            }
        });
    }


    private createPoint(point: ControlPoint| EndPoint): SVGRectElement {
        const attr = {
            fill: 'transparent',
            'fill-opacity': 1,
            width: pointSize,
            height: pointSize,
            x: point.x - pointRadius,
            y: point.y - pointRadius,
            stroke: ThemeColor,
            rx: '',
            ry: '',
            'pointer-events': 'all',
            'is-controls': true
        };
        if (point instanceof EndPoint) {
            attr.rx = pointRadius.toString();
            attr.ry = pointRadius.toString();
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
                elem.setAttribute('x', (item.x - pointRadius).toString());
                elem.setAttribute('y', (item.y - pointRadius).toString());
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
            elem.setAttribute('x', (firstEndPoint.x - pointRadius).toString());
            elem.setAttribute('y', (firstEndPoint.y - pointRadius).toString());
            elem.setAttribute('rx', pointRadius.toString());
            elem.setAttribute('ry', pointRadius.toString());
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

    private updateControlsLine(controlsArray: (ControlPoint | EndPoint)[]) {
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
            if (next) {
                p.push([
                    [item.x, item.y], [next.x, next.y]
                ]);
            }
            return p;
        }, []) as Array<[ [ number, number], [ number, number]]>;
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
            this.controlsArray = [point];
        } else {
            this.controlsArray.push(point);
        }

        this.updateControlsLine(this.controlsArray);
    }

    private parseLine(elem: SVGPathElement) {
        this.controlsArray = [];
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
                this.controlsArray.push(new EndPoint(...item));
            } else {
                this.controlsArray.push(new ControlPoint(...item));
            }
        });
        this.updateControlsLine(this.controlsArray);
    }

    public setControlPoint(x: number, y:number) {
        if (this.controlsArray.length === 0) {
            return;
        }
        const lasetEndPoint = this.controlsArray[this.controlsArray.length - 1];
        if (lasetEndPoint.x === x && lasetEndPoint.y === y) {
            return;
        }
        const point = new ControlPoint(x, y);

        this.setControlsArray(point);
    }

    public setEndPoint(x: number, y:number) {
        const point = new EndPoint(x, y);

        this.setControlsArray(point);
    }

    public updateOperation(elem: SVGPathElement) {
        this.parseLine(elem);
        this.updateControlsLine(this.controlsArray);
    }

    public updatePrviewByCursor(cursorPoint: ControlPoint| EndPoint) {
        if (this.controlsArray.length === 0 || this.mode !== Mode.DRAW) {
            return;
        }

        this.updateControlsLine([...this.controlsArray, cursorPoint]);
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

    public isClosedLoop() {
        if (this.controlsArray.length > 0) {
            const lasetEndPoint = this.controlsArray[this.controlsArray.length - 1];
            if (lasetEndPoint instanceof EndPoint) {
                this.controlsArray = [];
            }
        }
    }
}

export default OperationGroup;
