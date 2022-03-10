import { v4 as uuid } from 'uuid';
import { cloneDeep } from 'lodash';
import SvgModel from '../../../../models/SvgModel';
import { createSVGElement } from '../../element-utils';
import { ThemeColor, attachSpace } from './constants';
import { Point, EndPoint, ControlPoint } from './Point';
import Line from './Line';

enum Mode {
    NONE,
    DRAW,
    SELECT
}

export type TransformRecord = {
    line: Line,
    points: Point[]
}

class DrawGroup {
    public svgModel: SvgModel;

    public mode: Mode;

    public controlsArray: (ControlPoint | EndPoint)[] = []

    public cursor: SVGGElement

    private cursorPosition: Point

    public controlsLines: SVGGElement

    public controlsPoints: SVGGElement

    public instructionLine: SVGPathElement

    public instructionLine2: SVGPathElement

    private contentGroup: SVGGElement;

    private drawedLine: Line[] = []

    private graph: SVGGElement

    private guideX: SVGLineElement

    private guideY: SVGLineElement

    public onDrawLine: (line: SVGPathElement) => void;

    public onDrawDelete: (line: SVGPathElement[]) => void;

    public onDrawTransform: (records: { before: TransformRecord[], after: TransformRecord[] }) => void;

    public onDrawComplete

    private selected = {} as {
        line: Line,
        point?: SVGCircleElement,
        pointIndex?: Number
    };

    private hasTransform: boolean;

    private beforeTransform: TransformRecord[] = []

    private afterTransform: TransformRecord[] = []

    constructor(contentGroup) {
        this.contentGroup = contentGroup;
        this.init();

        this.contentGroup.append(this.instructionLine);
        this.contentGroup.append(this.cursor);
        this.contentGroup.append(this.controlsLines);
        // this.contentGroup.append(this.graph);
        this.contentGroup.append(this.controlsPoints);
        this.contentGroup.append(this.instructionLine2);
        this.contentGroup.append(this.guideX);
        this.contentGroup.append(this.guideY);
    }

    private init() {
        this.cursor = createSVGElement({
            element: 'g',
            attr: {
                id: 'cursor'
            }
        });
        this.cursor.appendChild(this.createControlPoint(0, 0, false));

        // <path d="M10 80 L 40 10 Z" fill="transparent" stroke="black" />
        this.instructionLine = createSVGElement({
            element: 'path',
            attr: {
                id: 'instructionLine',
                fill: 'transparent',
                stroke: 'black'
            }
        });
        this.instructionLine2 = createSVGElement({
            element: 'path',
            attr: {
                id: 'instructionLine2',
                fill: 'transparent',
                stroke: 'black'
            }
        });


        // <path d="M10 80 L 40 10 Z" fill="transparent" stroke="black" />
        this.controlsLines = createSVGElement({
            element: 'g',
            attr: {
                id: 'controlsLines'
            }
        });

        this.controlsPoints = createSVGElement({
            element: 'g',
            attr: {
                id: 'controlsPoints'
            }
        });

        this.guideX = createSVGElement({
            element: 'line',
            attr: {
                visibility: 'hidden',
                id: 'guideX',
                stroke: 'red'
            }
        });

        this.guideY = createSVGElement({
            element: 'line',
            attr: {
                visibility: 'hidden',
                id: 'guideY',
                stroke: 'red'
            }
        });
    }

    private drawgraph(points: Array<[number, number]>) {
        const line = createSVGElement({
            element: 'path',
            attr: {
                'stroke-width': 1,
                d: points.length === 2 ? `M ${points[0].join(' ')} L ${points[1].join(' ')} Z` : `M ${points[0].join(' ')} Q ${points[1].join(' ')}, ${points[2].join(' ')}`,
                fill: 'transparent',
                stroke: 'black'
            }
        }) as SVGPathElement;
        this.graph.append(line);

        this.drawedLine.push(new Line(line));

        this.onDrawLine && this.onDrawLine(line);
    }

    public deleteLine(lines: SVGPathElement[]) {
        if (lines && lines.length > 0) {
            lines.forEach(line => {
                this.delLine(this.getLine(line));
            });
            // this.onDrawDelete && this.onDrawDelete(lines);
        }
    }

    private setOperatingPoints(point: EndPoint | ControlPoint) {
        if (this.mode === Mode.DRAW && this.controlsArray.length > 0 && this.controlsArray[this.controlsArray.length - 1] instanceof ControlPoint) {
            this.controlsPoints.lastElementChild.remove();
        }
        this.unSelectAllOperationPoint();
        if (this.mode === Mode.DRAW || point instanceof ControlPoint) {
            const controlsPoint = this.createControlPoint(...point.point, point instanceof ControlPoint);
            this.controlsPoints.append(controlsPoint);
        }
        if (this.mode === Mode.DRAW && point instanceof EndPoint && this.controlsArray.length !== 0) {
            this.drawgraph([...this.controlsArray.map(p => p.point), point.point]);
            this.controlsArray = [];
            this.controlsLines.innerHTML = '';
        }
        const length = this.controlsArray.length;
        if (length !== 0) {
            if (!(this.mode === Mode.DRAW && point instanceof EndPoint) && this.controlsArray[length - 1] instanceof EndPoint) {
                const line = createSVGElement({
                    element: 'path',
                    attr: {
                        'stroke-width': 1,
                        d: `M ${this.controlsArray[length - 1].point.join(' ')} L ${point.point.join(' ')} Z`,
                        fill: 'transparent',
                        stroke: point instanceof ControlPoint ? ThemeColor : 'black'
                    }
                });
                this.controlsLines.append(line);
            } else if (point instanceof EndPoint && this.controlsArray[length - 1] instanceof ControlPoint) {
                if (this.mode === Mode.DRAW) {
                    const line = createSVGElement({
                        element: 'path',
                        attr: {
                            'stroke-width': 1,
                            d: `M ${this.controlsArray[length - 2].point.join(' ')} Q ${this.controlsArray[length - 1].point.join(' ')}, ${point.point.join(' ')}`,
                            fill: 'transparent',
                            stroke: 'black'
                        }
                    });
                    this.controlsLines.append(line);
                } else if (this.mode === Mode.SELECT) {
                    const line2 = createSVGElement({
                        element: 'path',
                        attr: {
                            'stroke-width': 1,
                            d: `M ${this.controlsArray[length - 1].point.join(' ')} L ${point.point.join(' ')} Z`,
                            fill: 'transparent',
                            stroke: ThemeColor
                        }
                    });
                    this.controlsLines.append(line2);
                }
            }
        }

        this.controlsArray.push(point);
    }

    private parsePoints(line: SVGPathElement) {
        // 前置判断
        // if (line.parentElement && line.parentElement.getAttribute('id').includes('graph')) {
        const d = line.getAttribute('d');
        const res: string[] = d.match(/\d+\.*\d*/g);
        const points: Array<[number, number]> = [];
        if (res) {
            for (let index = 0; index < res.length; index += 2) {
                points.push([
                    Number(res[index]),
                    Number(res[index + 1])
                ]);
            }
        }
        return points;
        // }
        // return null;
    }

    private clearAllPoints() {
        this.clearOperations(false);
    }

    public clearOperations(onlyOperation = true) {
        // 只清理控制点, 保留端点
        this.controlsArray = [];

        this.controlsPoints.innerHTML = '';
        this.controlsLines.innerHTML = '';
        if (onlyOperation) {
            this.drawedLine.forEach((item) => {
                this.controlsPoints.append(...item.EndPointsEle);
            });
        }

        this.controlsLines.remove();
        this.controlsPoints.remove();
        this.contentGroup.appendChild(this.controlsLines);
        this.contentGroup.appendChild(this.controlsPoints);
    }

    private createControlPoint(x, y, isControls = false): SVGCircleElement | SVGRectElement {
        let fill = '';
        if (this.mode === Mode.DRAW) {
            !isControls && (fill = ThemeColor);
        }
        // } else if (this.mode === Mode.SELECT) {
        //     this.selected?.position && this.selected.position[0] === x && this.selected.position[1] === y && (fill = ThemeColor);
        // }

        const attr = isControls ? {
            fill,
            'fill-opacity': 1,
            width: 4,
            height: 4,
            x: x - 2,
            y: y - 2,
            stroke: ThemeColor,
            'pointer-events': 'all',
            'is-controls': true
        } : {
            fill,
            'fill-opacity': 1,
            r: 2,
            cx: x,
            cy: y,
            stroke: ThemeColor,
            'pointer-events': 'all'
        };

        return createSVGElement({
            element: isControls ? 'rect' : 'circle',
            attr
        });
    }

    private updateCursorPosition() {
        const [x, y] = this.cursorPosition;
        if (this.mode === Mode.SELECT && this.selected.point) {
            this.selected.point.setAttribute('cx', x.toString());
            this.selected.point.setAttribute('cy', y.toString());
        } else {
            if (this.cursor.firstChild instanceof SVGCircleElement) {
                this.cursor.firstChild.setAttribute('cx', x.toString());
                this.cursor.firstChild.setAttribute('cy', y.toString());
            } else if (this.cursor.firstChild instanceof SVGRectElement) {
                this.cursor.firstChild.setAttribute('x', (x - 2).toString());
                this.cursor.firstChild.setAttribute('y', (y - 2).toString());
            }
        }
    }

    public setOperations(line?: SVGPathElement) {
        this.clearOperations();
        if (!line) {
            line = this.graph.firstElementChild as SVGPathElement;
        }
        if (!line) {
            return;
        }
        const points = this.parsePoints(line);
        if (points) {
            this.selected.line = this.getLine(line);

            points.forEach((p, index) => {
                if (index === 0 || index === points.length - 1) {
                    this.setOperatingPoints(new EndPoint(p));
                } else {
                    this.setOperatingPoints(new ControlPoint(p));
                }
            });
        }
    }

    public startDraw(svg?: SVGGElement) {
        this.mode = Mode.DRAW;
        this.drawedLine = [];

        if (svg) {
            this.graph = svg;
            this.generateEndPoints(svg);
        } else {
            this.graph = createSVGElement({
                element: 'g',
                attr: {
                    id: `graph-${uuid()}`
                }
            });
        }
        this.contentGroup.append(this.graph);

        this.graph.lastElementChild && this.setOperations(this.graph.lastElementChild as SVGPathElement);
        this.toogleVisible(true);
    }

    public startSelect(svg: SVGGElement) {
        this.mode = Mode.SELECT;
        this.drawedLine = [];

        this.graph = svg;
        this.generateEndPoints(svg);

        this.toogleVisible(true);
    }

    private generateEndPoints(svg) {
        this.clearAllPoints();
        svg.childNodes.forEach((line: SVGPathElement) => {
            this.appendLine(line);
        });
    }

    public appendLine(line: SVGPathElement) {
        const _line = new Line(line);
        this.drawedLine.push(_line);

        this.controlsPoints.append(..._line.EndPointsEle);
        if (!Array.from(this.graph.childNodes).find(ele => ele === _line.ele)) {
            this.graph.appendChild(_line.ele);
        }
    }

    private toogleVisible(visible) {
        this.controlsLines.setAttribute('visibility', visible ? 'visible' : 'hidden');
        this.controlsPoints.setAttribute('visibility', visible ? 'visible' : 'hidden');
        this.instructionLine.setAttribute('visibility', (this.mode === Mode.DRAW && visible) ? 'visible' : 'hidden');
        this.instructionLine2.setAttribute('visibility', (this.mode === Mode.DRAW && visible) ? 'visible' : 'hidden');
        this.cursor.setAttribute('visibility', (this.mode === Mode.DRAW && visible) ? 'visible' : 'hidden');
    }

    public finishDraw() {
        this.svgModel = null;
    }

    private isSelectControlsPoint(point): Point | false {
        if (point.getAttribute('is-controls')) {
            const x = point.getAttribute('x');
            const y = point.getAttribute('y');
            return [Number(x) + 2, Number(y) + 2];
        }
        return false;
    }

    public delLine(line: Line) {
        line.del();
        this.drawedLine = this.drawedLine.filter(item => item !== line);
    }

    public getLine(mark: SVGPathElement | SVGCircleElement) {
        return this.drawedLine.find(item => {
            if (mark instanceof SVGPathElement) {
                return item.ele === mark;
            } else {
                const position = this.isSelectControlsPoint(mark);
                if (position) {
                    return item.points.some(p => p[0] === position[0] && p[1] === position[1]);
                }
                return item.EndPointsEle.includes(mark);
            }
        });
    }

    private unSelectAllOperationPoint() {
        Array.from(this.controlsPoints.children).forEach(p => {
            p.setAttribute('fill', '');
        });
    }

    private recordTransform() {
        const pointRecords = [];
        if (this.selected.pointIndex) {
            pointRecords.push({
                line: this.selected.line,
                points: cloneDeep(this.selected.line.points)
            });
        } else if (this.selected.point) {
            this.drawedLine.forEach((p) => {
                const index = p.EndPointsEle.findIndex(ele => ele === this.selected.point);
                if (index !== -1) {
                    pointRecords.push({
                        line: p,
                        points: cloneDeep(p.points)
                    });
                }
            });
        } else if (this.selected.line) {
            this.queryLink(this.selected.line.ele).forEach(item => {
                pointRecords.push({
                    line: item.line,
                    points: cloneDeep(item.line.points)
                });
            });
        }
        return pointRecords;
    }

    public onMouseDown(target: SVGPathElement | SVGCircleElement) {
        const [x, y] = this.cursorPosition;

        if (this.mode === Mode.DRAW) {
            this.instructionLine2.setAttribute('d', '');
            this.setOperatingPoints(new EndPoint([x, y]));
            return;
        }
        if (this.mode === Mode.SELECT) {
            this.selected.line && this.selected.line.ele.setAttribute('stroke', 'black');
            this.unSelectAllOperationPoint();
            if ((target.parentElement as unknown as SVGGElement) !== this.controlsPoints && target.parentElement.getAttribute('id')?.includes('graph')) {
                this.setOperations(target);
                this.selected.line.ele.setAttribute('stroke', ThemeColor);
                this.selected.point = null;
                this.selected.pointIndex = null;
                this.beforeTransform = this.recordTransform();
                return;
            }
            if ((target.parentElement as unknown as SVGGElement) === this.controlsPoints) {
                target.setAttribute('fill', ThemeColor);

                const position = this.isSelectControlsPoint(target);
                if (position) {
                    this.selected.line = this.getLine(target);
                    this.selected.point = target as SVGCircleElement;
                    this.selected.pointIndex = this.selected.line.points.findIndex(p => p[0] === position[0] && p[1] === position[1]);
                } else {
                    this.selected.line = this.getLine(target);
                    this.selected.point = target as SVGCircleElement;
                    this.selected.pointIndex = null;
                }
                this.beforeTransform = this.recordTransform();
                return;
            }
            // this.selected.line && this.selected.line.ele.setAttribute('stroke', 'black');
            this.selected.line = null;
            this.selected.point = null;
            this.selected.pointIndex = null;
        }
        this.clearOperations();
    }

    public onMouseUp(x: number, y: number) {
        if (this.mode === Mode.DRAW) {
            if (this.isClosedLoop()) {
                this.controlsArray = [];
            } else {
                const laestEnd = this.controlsArray[this.controlsArray.length - 1];
                if (laestEnd && laestEnd.point[0] !== x && laestEnd.point[1] !== y) {
                    this.setOperatingPoints(new ControlPoint([x, y]));
                }
            }
            return;
        }
        if (this.mode === Mode.SELECT) {
            if (this.hasTransform) {
                this.hasTransform = false;
                this.queryLink(this.selected.line.ele).forEach(item => item.line.updatePosition());

                this.afterTransform = this.recordTransform();
                this.onDrawTransform({ before: this.beforeTransform, after: this.afterTransform });
            }
            this.calculateConnection();
            this.setGuideLineVisibility(false);
        }
    }

    private calculateConnection() {
        this.drawedLine.forEach(line => {
            line.EndPointsEle = [];
            line.generateEndPointEle();
        });
    }

    private setGuideLineVisibility(visible: boolean) {
        this.guideX.setAttribute('visibility', visible ? 'visible' : 'hidden');
        this.guideY.setAttribute('visibility', visible ? 'visible' : 'hidden');
    }

    // private updatedrawedPoints() {
    //     this.drawedLine.forEach(item => {
    //         const res = this.controlsArray.some(point => {
    //             if (point instanceof EndPoint) {
    //                 // TODO 没必要全部遍历
    //                 const index = item.points.findIndex(p => p[0] === point.point[0] && p[1] === point.point[1]);
    //                 return index !== -1;
    //             }
    //             return false;
    //         });
    //         if (res) {
    //             item.points = this.parsePoints(item.line);
    //         }
    //     });
    // }

    private drawCursor(leftKeyPressed: boolean, cx: number, cy: number) {
        if (leftKeyPressed) {
            if (this.cursor.firstChild && this.cursor.firstChild instanceof SVGRectElement) {
                return;
            }
            if (this.cursor.firstChild && this.cursor.firstChild instanceof SVGCircleElement) {
                this.cursor.firstChild.remove();
            }
            this.cursor.appendChild(this.createControlPoint(cx, cy, true));
        } else if (!leftKeyPressed) {
            if (this.cursor.firstChild && this.cursor.firstChild instanceof SVGCircleElement) {
                return;
            }
            if (this.cursor.firstChild && this.cursor.firstChild instanceof SVGRectElement) {
                this.cursor.firstChild.remove();
            }
            this.cursor.appendChild(this.createControlPoint(cx, cy, false));
        }
    }

    private isClosedLoop() {
        const attachPoint = this.controlsLines.querySelector('#attachPoint');
        return attachPoint && attachPoint.getAttribute('visibility') === 'visibility';
    }

    private updateAttachPoint(x?: number, y?: number) {
        const attachPoint = this.controlsLines.querySelector('#attachPoint');
        if (x && y) {
            if (attachPoint) {
                attachPoint.setAttribute('cx', (x + 5).toString());
                attachPoint.setAttribute('cy', (y + 5).toString());
                attachPoint.setAttribute('visibility', 'visible');
            } else {
                const p = this.createControlPoint(x + 5, y + 5, false);
                p.setAttribute('id', 'attachPoint');
                p.setAttribute('fill', '');
                this.controlsLines.appendChild(p);
            }
        } else {
            attachPoint && attachPoint.setAttribute('visibility', 'hidden');
        }
    }

    private attachCursor(x: number, y: number): Point {
        this.setGuideLineVisibility(false);

        let min: number = attachSpace;
        let minPoint: Point;
        let guideX: Point;
        let guideY: Point;
        this.drawedLine.forEach((line) => {
            const selfIndex = line.EndPointsEle.findIndex(ele => ele === this.selected.point);
            line.EndPoins.forEach((p, index) => {
                if (selfIndex !== -1 && selfIndex === index) {
                    return;
                }
                if (Math.abs(x - p[0]) <= attachSpace || Math.abs(y - p[1]) <= attachSpace) {
                    if (Math.abs(x - p[0]) <= attachSpace) {
                        guideX = p;
                    }
                    if (Math.abs(y - p[1]) <= attachSpace) {
                        guideY = p;
                    }
                    if (Math.abs(x - p[0]) <= attachSpace && Math.abs(y - p[1]) <= attachSpace) {
                        if ((Math.abs(x - p[0]) < min || Math.abs(y - p[1]) < min)) {
                            minPoint = p;
                            min = Math.min(Math.abs(x - p[0]), Math.abs(y - p[1]));
                        }
                    }
                }
            });
        });
        if (minPoint) {
            this.updateAttachPoint(...minPoint);
            return minPoint;
        }
        this.updateAttachPoint();

        if (guideX || guideY) {
            if (guideX && guideY) {
                this.setGuideLineVisibility(true);
                this.guideX.setAttribute('x1', guideX[0].toString());
                this.guideX.setAttribute('y1', guideY[1].toString());
                this.guideX.setAttribute('x2', guideX[0].toString());
                this.guideX.setAttribute('y2', guideX[1].toString());

                this.guideY.setAttribute('x1', guideX[0].toString());
                this.guideY.setAttribute('y1', guideY[1].toString());
                this.guideY.setAttribute('x2', guideY[0].toString());
                this.guideY.setAttribute('y2', guideY[1].toString());
                return [guideX[0], guideY[1]];
            }
            if (guideX) {
                this.guideX.setAttribute('visibility', 'visible');
                this.guideX.setAttribute('x1', guideX[0].toString());
                this.guideX.setAttribute('y1', y.toString());
                this.guideX.setAttribute('x2', guideX[0].toString());
                this.guideX.setAttribute('y2', guideX[1].toString());
                return [guideX[0], y];
            }
            if (guideY) {
                this.guideY.setAttribute('visibility', 'visible');
                this.guideY.setAttribute('x1', x.toString());
                this.guideY.setAttribute('y1', guideY[1].toString());
                this.guideY.setAttribute('x2', guideY[0].toString());
                this.guideY.setAttribute('y2', guideY[1].toString());
                return [x, guideY[1]];
            }
        }
        return [x, y];
    }

    private drawInstructionLines(leftKeyPressed: boolean) {
        const [cx, cy] = this.cursorPosition;
        const length = this.controlsArray.length;
        if (length === 0) {
            return;
        }
        if (this.controlsArray[length - 1] instanceof EndPoint) {
            this.instructionLine.setAttribute('stroke', leftKeyPressed ? ThemeColor : 'black');
            this.instructionLine.setAttribute('d', `M ${this.controlsArray[length - 1].point.join(' ')} L ${cx} ${cy} Z`);
            return;
        }
        if (this.controlsArray[length - 1] instanceof ControlPoint) {
            this.instructionLine.setAttribute('stroke', 'black');
            this.instructionLine.setAttribute('d', `M ${this.controlsArray[length - 2].point.join(' ')} Q ${this.controlsArray[length - 1].point.join(' ')}, ${cx} ${cy}`);

            this.instructionLine2.setAttribute('stroke', ThemeColor);
            this.instructionLine2.setAttribute('d', `M ${this.controlsArray[length - 1].point.join(' ')} L ${cx} ${cy}`);
        }
    }

    // private pointIsEqe(p1: Point, p2: Point) {
    //     return p1[0] === p2[0] && p1[1] === p2[1];
    // }

    private transformOperatingPoint([cx, cy]) {
        this.hasTransform = true;

        if (typeof this.selected.pointIndex === 'number') {
            this.selected.line.points[this.selected.pointIndex][0] = cx;
            this.selected.line.points[this.selected.pointIndex][1] = cy;
            this.selected.line.updatePosition(this.selected.line.points);
        } else {
            this.drawedLine.forEach((p) => {
                const index = p.EndPointsEle.findIndex(ele => ele === this.selected.point);
                if (index !== -1) {
                    p.EndPoins[index][0] = cx;
                    p.EndPoins[index][1] = cy;
                    p.updatePosition(p.points);
                }
            });
        }
    }

    private queryLink(line: SVGPathElement) {
        const selectedLine = this.getLine(line);
        const links = new Map<Line, { line: Line, indexs: number[] }>();
        this.drawedLine.forEach(item => {
            if (item.ele === line) {
                links.set(item, {
                    indexs: Array(item.points.length).fill(0).map((_, index) => index),
                    line: item
                });
            } else {
                const circleEles = item.EndPointsEle;
                selectedLine.EndPointsEle.forEach(circle => {
                    const circleIndex = circleEles.findIndex(i => circle === i);
                    const index = item.points.findIndex(p => p === item.EndPoins[circleIndex]);
                    if (index !== -1) {
                        const has = links.get(item);
                        if (has) {
                            has.indexs.push(index);
                        } else {
                            links.set(item, {
                                indexs: [index],
                                line: item
                            });
                        }
                    }
                });
            }
        });
        return Array.from(links.values());
    }

    private transformLine(dx: number, dy: number) {
        this.hasTransform = true;

        this.queryLink(this.selected.line.ele).forEach(item => {
            const _points = cloneDeep(item.line.points);

            item.indexs.forEach((index) => {
                _points[index][0] += dx;
                _points[index][1] += dy;
            });
            item.line.updatePosition(_points);
        });
    }

    public onMouseMove(event: MouseEvent, [cx, cy]: [number, number], [dx, dy]: [number, number]) {
        if (this.mode === Mode.NONE) {
            return;
        }
        const leftKeyPressed = event.which === 1;
        if (this.mode === Mode.SELECT && !leftKeyPressed) {
            this.setGuideLineVisibility(false);
            return;
        }
        this.drawCursor(leftKeyPressed, cx, cy);
        const [x, y] = this.attachCursor(cx, cy);
        this.cursorPosition = [x, y];
        this.updateCursorPosition();
        if (this.mode === Mode.DRAW) {
            this.drawInstructionLines(leftKeyPressed);
            return;
        }
        // move controls points
        if (this.mode === Mode.SELECT && leftKeyPressed && this.selected.point) {
            this.transformOperatingPoint([x, y]);
            this.setOperations(this.selected.line.ele);
            return;
        }
        // move line
        if (this.mode === Mode.SELECT && leftKeyPressed && this.selected.line) {
            this.transformLine(dx, dy);
            this.setOperations(this.selected.line.ele);
        }
    }


    public complete() {
        if (this.mode === Mode.NONE) {
            return null;
        }

        this.toogleVisible(false);


        if (this.mode === Mode.DRAW) {
            this.mode = Mode.SELECT;
            if (this.onDrawComplete) {
                this.onDrawComplete(this.graph);
            }
            return this.graph;
        }
        if (this.mode === Mode.SELECT) {
            this.mode = Mode.NONE;
        }

        return null;
    }
}

export default DrawGroup;
