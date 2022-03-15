import { v4 as uuid } from 'uuid';
import { cloneDeep } from 'lodash';
import SvgModel from '../../../../models/SvgModel';
import { createSVGElement } from '../../element-utils';
import { ThemeColor, attachSpace, Mode } from './constants';
import { Point, EndPoint, ControlPoint } from './Point';
import Line from './Line';
import OperationGroup from './OperationGroup';


export type TransformRecord = {
    line: Line,
    points: Point[]
}

class DrawGroup {
    public svgModel: SvgModel;

    public mode: Mode = Mode.NONE;

    public cursorGroup: SVGGElement

    private cursorPosition: Point

    private operationGroup: OperationGroup;

    private contentGroup: SVGGElement;

    private endPointsGroup: SVGGElement;

    private drawedLine: Line[] = []

    private graph: SVGPathElement

    private originGraph: SVGPathElement

    private guideX: SVGLineElement

    private guideY: SVGLineElement

    public onDrawLine: (line: SVGPathElement) => void;

    public onDrawDelete: (line: SVGPathElement[]) => void;

    public onDrawTransform: (records: { before: TransformRecord[], after: TransformRecord[] }) => void;

    public onDrawComplete

    public onDrawTransformComplete: (records: { target: SVGPathElement, before: string, after: string }) => void;

    private selected = {} as {
        line: Line,
        point?: SVGRectElement,
        pointIndex?: Number
    };

    private hasTransform: boolean;

    private beforeTransform: TransformRecord[] = []

    private afterTransform: TransformRecord[] = []

    constructor(contentGroup) {
        this.contentGroup = contentGroup;
        this.init();

        this.contentGroup.append(this.cursorGroup);
        this.contentGroup.append(this.guideX);
        this.contentGroup.append(this.guideY);
        this.contentGroup.append(this.endPointsGroup);

        this.operationGroup = new OperationGroup(contentGroup);
        // const t = this;
        this.operationGroup.onDrawgraph = (points: Array<[number, number]>) => {
            this.drawgraph(points);
        };
    }

    private init() {
        this.cursorGroup = createSVGElement({
            element: 'g',
            attr: {
                id: 'cursorGroup'
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
        this.endPointsGroup = createSVGElement({
            element: 'g',
            attr: {
                id: 'endPointsGroup'
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

        this.appendLine(line);
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

    // private parsePoints(line: SVGPathElement) {
    //     // 前置判断
    //     // if (line.parentElement && line.parentElement.getAttribute('id').includes('graph')) {
    //     const d = line.getAttribute('d');
    //     const res: string[] = d.match(/\d+\.*\d*/g);
    //     const points: Array<[number, number]> = [];
    //     if (res) {
    //         for (let index = 0; index < res.length; index += 2) {
    //             points.push([
    //                 Number(res[index]),
    //                 Number(res[index + 1])
    //             ]);
    //         }
    //     }
    //     return points;
    //     // }
    //     // return null;
    // }

    private getPointCoordinate(point: SVGRectElement) {
        const x = point.getAttribute('x');
        const y = point.getAttribute('y');
        return { x: Number(x) + 2, y: Number(y) + 2 };
    }

    private createControlPoint(x, y, isControls = false): SVGRectElement {
        let fill = '';
        if (this.mode === Mode.DRAW) {
            !isControls && (fill = ThemeColor);
        }

        const attr = {
            fill,
            'fill-opacity': 1,
            width: 4,
            height: 4,
            x: x - 2,
            y: y - 2,
            rx: '0',
            ry: '0',
            stroke: ThemeColor,
            'pointer-events': 'all',
            'is-controls': true
        };
        if (!isControls) {
            attr.rx = '2';
            attr.ry = '2';
        }
        return createSVGElement({
            element: 'rect',
            attr
        });
    }

    private updateCursorPosition(leftKeyPressed: boolean) {
        const [x, y] = this.cursorPosition;
        if (this.mode === Mode.DRAW) {
            const cursorPoint = this.cursorGroup.querySelector('#cursorPoint');
            cursorPoint.setAttribute('x', (x - 2).toString());
            cursorPoint.setAttribute('y', (y - 2).toString());
        } else if (this.mode === Mode.SELECT && leftKeyPressed) {
            if (this.selected.point) {
                this.selected.point.setAttribute('x', (x - 2).toString());
                this.selected.point.setAttribute('y', (y - 2).toString());
            }
        }
    }

    private setMode(mode: Mode) {
        this.mode = mode;

        // if (mode === Mode.SELECT) {
        //     this.beforeGraphTransform = this.drawedLine.map(line => {
        //         return {
        //             line,
        //             points: cloneDeep(line.points)
        //         };
        //     });
        // }

        this.updateAttachPoint();
        this.unSelectAllEndPoint();

        this.operationGroup.mode = mode;
        this.operationGroup.clearOperation();
    }

    public startDraw(svg?: SVGPathElement) {
        if (this.mode !== Mode.NONE) {
            return;
        }

        this.drawedLine = [];

        this.graph = createSVGElement({
            element: 'g',
            attr: {
                id: `graph-${uuid()}`
            }
        });
        this.contentGroup.append(this.graph);

        if (svg) {
            this.originGraph = svg;

            // this.graph = svg;
            this.originGraph.setAttribute('visibility', 'hidden');
            this.generateEndPoints(svg);
            this.setMode(Mode.SELECT);
        } else {
            this.setMode(Mode.DRAW);
        }

        this.graph.lastElementChild && this.operationGroup.updateOperation(this.graph.lastElementChild as SVGPathElement);
        this.toogleVisible(true);
    }

    public resetOperationByselect() {
        this.resetOperation(this.selected.line);
    }

    public resetOperation(line?: Line) {
        this.operationGroup.clearOperation();
        if (!line) {
            line = this.drawedLine[this.drawedLine.length - 1];
        }
        line && this.operationGroup.updateOperation(line.ele);
    }

    // public startSelect(svg: SVGPathElement) {
    //     this.setMode(Mode.SELECT);
    //     this.drawedLine = [];

    //     this.graph = svg;
    //     this.generateEndPoints(svg);

    //     this.toogleVisible(true);
    // }

    private generateEndPoints(svg: SVGPathElement) {
        // this.clearAllPoints();
        const d = svg.getAttribute('d');
        const arr = d.split('M ');
        arr.forEach((str) => {
            if (str) {
                const line = createSVGElement({
                    element: 'path',
                    attr: {
                        'stroke-width': 1,
                        d: `M ${str}`,
                        fill: 'transparent',
                        stroke: 'black'
                    }
                }) as SVGPathElement;

                this.appendLine(line);
            }
        });
    }

    public appendLine(line: SVGPathElement) {
        const _line = new Line(line);
        this.drawedLine.push(_line);

        this.endPointsGroup.append(..._line.EndPointsEle);
        if (!Array.from(this.graph.childNodes).find(ele => ele === _line.ele)) {
            this.graph.appendChild(_line.ele);
        }
    }

    private toogleVisible(visible) {
        this.cursorGroup.setAttribute('visibility', (this.mode === Mode.DRAW && visible) ? 'visible' : 'hidden');
    }

    public finishDraw() {
        this.svgModel = null;
    }


    private delLine(line: Line) {
        line.del();
        this.drawedLine = this.drawedLine.filter(item => item !== line);
    }

    public getLineByPoint(point: SVGRectElement) {
        const { x, y } = this.getPointCoordinate(point);
        return this.drawedLine.find(item => {
            return item.points.some(p => p[0] === x && p[1] === y);
        });
    }

    public getLine(mark: SVGPathElement | SVGRectElement) {
        return this.drawedLine.find(item => {
            if (mark instanceof SVGPathElement) {
                return item.ele === mark;
            } else if (mark instanceof SVGRectElement) {
                const { x, y } = this.getPointCoordinate(mark);
                return item.points.some(p => p[0] === x && p[1] === y);
            } else {
                return false;
            }
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

    private unSelectAllEndPoint() {
        Array.from(this.endPointsGroup.children).forEach(p => {
            p.setAttribute('fill', '');
        });
    }

    public onMouseDown(target: SVGPathElement | SVGRectElement) {
        const [x, y] = this.cursorPosition;

        if (this.mode === Mode.DRAW) {
            // const attachPoint = this.cursorGroup.querySelector('#attachPoint');

            this.operationGroup.setEndPoint(x, y);
            return;
        }
        if (this.mode === Mode.SELECT) {
            this.selected.line && this.selected.line.ele.setAttribute('stroke', 'black');
            const parent = target.parentElement as unknown as SVGGElement;
            this.unSelectAllEndPoint();

            if (parent === this.endPointsGroup || parent === this.operationGroup.controlPoints) {
                target.setAttribute('fill', ThemeColor);

                this.selected.line = this.getLine(target);
                this.selected.point = target as SVGRectElement;
                const coordinate = this.getPointCoordinate(target as SVGRectElement);
                if (parent === this.operationGroup.controlPoints) {
                    this.selected.pointIndex = this.selected.line.points.findIndex(p => p[0] === coordinate.x && p[1] === coordinate.y);
                } else {
                    this.selected.pointIndex = null;
                }

                this.beforeTransform = this.recordTransform();
                return;
            }
            if (parent.getAttribute('id')?.includes('graph')) {
                target.setAttribute('stroke', ThemeColor);

                this.operationGroup.updateOperation(target);
                this.selected.line = this.getLine(target);
                this.selected.pointIndex = null;
                this.beforeTransform = this.recordTransform();
                return;
            }
            // this.selected.line && this.selected.line.ele.setAttribute('stroke', 'black');
            this.selected.line = null;
            this.selected.point = null;
            this.selected.pointIndex = null;
        }
        this.operationGroup.clearOperation();
    }

    public onMouseUp() {
        if (this.mode === Mode.DRAW) {
            if (this.isClosedLoop()) {
                this.operationGroup.controlsArray = [];
            } else {
                // const laestEnd = this.controlsArray[this.controlsArray.length - 1];
                // if (laestEnd && laestEnd.point[0] !== x && laestEnd.point[1] !== y) {
                this.operationGroup.setControlPoint(...this.cursorPosition);
                // }
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

    private drawCursor(leftKeyPressed: boolean, x: number, y: number) {
        if (this.mode === Mode.DRAW) {
            let cursorPoint = this.cursorGroup.querySelector('#cursorPoint');
            if (!cursorPoint) {
                cursorPoint = this.createControlPoint(0, 0, false);
                cursorPoint.setAttribute('id', 'cursorPoint');
                this.cursorGroup.appendChild(cursorPoint);
            }

            if (cursorPoint) {
                cursorPoint.setAttribute('x', (x - 2).toString());
                cursorPoint.setAttribute('y', (y - 2).toString());
            }
            if (leftKeyPressed) {
                cursorPoint.setAttribute('rx', '0');
                cursorPoint.setAttribute('ry', '0');
            } else if (!leftKeyPressed) {
                cursorPoint.setAttribute('rx', '2');
                cursorPoint.setAttribute('ry', '2');
            }
        }
    }

    private isClosedLoop() {
        const attachPoint = this.cursorGroup.querySelector('#attachPoint');
        return attachPoint && attachPoint.getAttribute('visibility') === 'visible';
    }

    private updateAttachPoint(x?: number, y?: number) {
        const attachPoint = this.cursorGroup.querySelector('#attachPoint');
        if (x && y) {
            if (attachPoint) {
                attachPoint.setAttribute('x', (x + 10).toString());
                attachPoint.setAttribute('y', (y + 10).toString());
                // attachPoint.setAttribute('rx', '0');
                // attachPoint.setAttribute('ry', '0');
                attachPoint.setAttribute('visibility', 'visible');
            } else {
                const p = this.createControlPoint(x + 5, y + 5, false);
                p.setAttribute('id', 'attachPoint');
                p.setAttribute('fill', 'white');
                p.setAttribute('stroke', 'black');
                this.cursorGroup.appendChild(p);
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
            this.updateAttachPoint(x, y);
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

    private transformOperatingPoint([x, y]) {
        this.hasTransform = true;
        console.log('=================', this.selected.pointIndex);

        if (typeof this.selected.pointIndex === 'number') {
            this.selected.line.points[this.selected.pointIndex][0] = x;
            this.selected.line.points[this.selected.pointIndex][1] = y;
            this.selected.line.updatePosition(this.selected.line.points);
        } else {
            this.drawedLine.forEach((p) => {
                const index = p.EndPointsEle.findIndex(ele => ele === this.selected.point);
                console.log(index);

                if (index !== -1) {
                    p.EndPoins[index][0] = x;
                    p.EndPoins[index][1] = y;
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

        this.drawCursor(leftKeyPressed, cx, cy);
        const [x, y] = this.attachCursor(cx, cy);
        this.cursorPosition = [x, y];
        this.updateCursorPosition(leftKeyPressed);

        if (this.mode === Mode.DRAW) {
            this.operationGroup.updatePrviewByCursor(leftKeyPressed ? new ControlPoint(x, y) : new EndPoint(x, y));
        } else {
            if (!leftKeyPressed) {
                this.setGuideLineVisibility(false);
                return;
            }
            // move controls points
            if (leftKeyPressed && this.selected.point) {
                this.transformOperatingPoint([x, y]);
                this.operationGroup.updateOperation(this.selected.line.ele);
                return;
            }
            // move line
            if (leftKeyPressed && this.selected.line) {
                this.transformLine(dx, dy);
                this.operationGroup.updateOperation(this.selected.line.ele);
            }
        }
    }

    private compD() {
        const { d } = this.drawedLine.reduce((p, c) => {
            // if (p.end.length === 2 && c.points.length === 2) {
            //     if (p.end[1][0] === c.points[0][0] && p.end[1][1] === c.points[0][1]) {
            //         p.d += `L ${c.points[1].join(' ')}`;
            //     }
            // } else if (p.end.length === 3 && c.points.length === 3) {
            //     if (p.end[2][0] === c.points[0][0] && p.end[2][1] === c.points[0][1]) {
            //         p.d += `T ${c.points[1].join(' ')}, ${c.points[2].join(' ')}`;
            //     }
            // } else {
            p.d += c.points.length === 3 ? `M ${c.points[0].join(' ')} Q ${c.points[1].join(' ')} , ${c.points[2].join(' ')}` : `M ${c.points[0].join(' ')} , ${c.points[1].join(' ')}`;
            // }
            p.end = c.points;
            return p;
        }, { d: '', end: [] });

        return d;
    }

    public drawComplete() {
        if (this.mode !== Mode.DRAW) {
            return null;
        }

        this.toogleVisible(false);
        this.setMode(Mode.NONE);
        const d = this.compD();

        const graph = createSVGElement({
            element: 'path',
            attr: {
                id: `graph-${uuid()}`,
                'stroke-width': 1,
                d,
                source: d,
                fill: 'transparent',
                stroke: 'black'
            }
        }) as SVGPathElement;
        this.graph.remove();
        this.contentGroup.append(graph);

        const { x, y, width, height } = graph.getBBox();
        graph.setAttribute('x', (x + width / 2).toString());
        graph.setAttribute('y', (y + height / 2).toString());

        if (this.onDrawComplete) {
            this.onDrawComplete(graph);
        }
        return graph;
    }

    public transformComplete() {
        if (this.mode !== Mode.SELECT) {
            return;
        }
        this.originGraph.setAttribute('visibility', 'visible');
        const beforeGraphTransform = this.originGraph.getAttribute('d');
        const d = this.compD();
        this.originGraph.setAttribute('d', d);
        this.originGraph.setAttribute('source', d);
        this.graph.remove();

        const { x, y, width, height } = this.originGraph.getBBox();
        this.originGraph.setAttribute('x', (x + width / 2).toString());
        this.originGraph.setAttribute('y', (y + height / 2).toString());


        this.toogleVisible(false);
        if (this.onDrawTransformComplete) {
            this.onDrawTransformComplete({
                target: this.originGraph,
                before: beforeGraphTransform,
                after: d
            });
        }
        this.setMode(Mode.NONE);
    }
}

export default DrawGroup;
