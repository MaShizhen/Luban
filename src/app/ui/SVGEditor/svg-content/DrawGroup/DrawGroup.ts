import { v4 as uuid } from 'uuid';
import { cloneDeep } from 'lodash';
import SvgModel from '../../../../models/SvgModel';
import { createSVGElement } from '../../element-utils';
import { ThemeColor, attachSpace, Mode, pointRadius } from './constants';
import { Point, EndPoint, ControlPoint } from './Point';
import Line from './Line';
import OperationGroup from './OperationGroup';
import CursorGroup from './CursorGroup';


export type TransformRecord = {
    line: Line,
    points: Point[]
}

class DrawGroup {
    public svgModel: SvgModel;

    public mode: Mode = Mode.NONE;

    private cursorGroup: CursorGroup;

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

    public onDrawStart: (elem?: SVGPathElement) => void;

    public onDrawComplete: (elem: SVGPathElement) => void;

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

        this.contentGroup.parentElement.append(this.guideX);
        this.contentGroup.parentElement.append(this.guideY);
        this.contentGroup.parentElement.append(this.endPointsGroup);

        this.cursorGroup = new CursorGroup();
        this.contentGroup.parentElement.append(this.cursorGroup.group);


        this.operationGroup = new OperationGroup(contentGroup);
        // const t = this;
        this.operationGroup.onDrawgraph = (points: Array<[number, number]>) => {
            this.drawgraph(points);
        };
    }

    private init() {
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

    public deleteLine(line: SVGPathElement) {
        if (line) {
            this.delLine(this.getLine(line));
        }
    }

    private getPointCoordinate(point: SVGRectElement) {
        const x = point.getAttribute('x');
        const y = point.getAttribute('y');
        return { x: Number(x) + pointRadius, y: Number(y) + pointRadius };
    }

    private updateSelectPoint() {
        const [x, y] = this.cursorPosition;

        if (this.selected.point) {
            this.selected.point.setAttribute('x', (x - pointRadius).toString());
            this.selected.point.setAttribute('y', (y - pointRadius).toString());
        }
    }

    private setMode(mode: Mode) {
        this.mode = mode;

        if (mode !== Mode.NONE) {
            this.onDrawStart && this.onDrawStart(this.originGraph);
        }

        this.cursorGroup.setAttachPoint();
        this.unSelectAllEndPoint();

        this.operationGroup.mode = mode;
        this.cursorGroup.mode = mode;
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

            this.originGraph.setAttribute('visibility', 'hidden');
            this.generateEndPoints(svg);
            this.setMode(Mode.SELECT);
        } else {
            this.cursorGroup.toogleVisible(true);
            this.setMode(Mode.DRAW);
        }

        this.graph.lastElementChild && this.operationGroup.updateOperation(this.graph.lastElementChild as SVGPathElement);
    }

    public resetOperationByselect() {
        this.resetOperation(this.selected.line);
    }

    public resetOperation(line?: Line) {
        this.operationGroup.clearOperation();
        if (!line) {
            line = this.drawedLine[this.drawedLine.length - 1];
        }
        if (line) {
            this.operationGroup.updateOperation(line.elem);

            this.operationGroup.updatePrviewByCursor(new EndPoint(...this.cursorPosition));
        }
    }

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
        if (!Array.from(this.graph.childNodes).find(elem => elem === _line.elem)) {
            this.graph.appendChild(_line.elem);
        }
    }

    public finishDraw() {
        this.svgModel = null;
    }


    private delLine(line: Line) {
        line.del();
        this.drawedLine = this.drawedLine.filter(item => item !== line);
        line.EndPointsEle.filter((elem) => {
            const flag = this.drawedLine.some(item => item.EndPointsEle.includes(elem));
            return !flag;
        }).forEach(elem => elem.remove());
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
                return item.elem === mark;
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
                const index = p.EndPointsEle.findIndex(elem => elem === this.selected.point);
                if (index !== -1) {
                    pointRecords.push({
                        line: p,
                        points: cloneDeep(p.points)
                    });
                }
            });
        } else if (this.selected.line) {
            this.queryLink(this.selected.line.elem).forEach(item => {
                pointRecords.push({
                    line: item.line,
                    points: cloneDeep(item.line.points)
                });
            });
        }
        return pointRecords;
    }

    private clearAllEndPoint() {
        Array.from(this.endPointsGroup.children).forEach(p => {
            p.remove();
        });
    }

    private unSelectAllEndPoint() {
        Array.from(this.endPointsGroup.children).forEach(p => {
            p.setAttribute('fill', '');
        });
    }

    public onDelete() {
        if (this.selected.line) {
            let deleteLines;
            if (this.selected.pointIndex) {
                this.delLine(this.selected.line);
                deleteLines = [this.selected.line.elem];
            } else if (this.selected.point) {
                deleteLines = this.drawedLine.filter((line) => {
                    return line.EndPointsEle.findIndex(elem => elem === this.selected.point) !== -1;
                }).map((line) => {
                    this.delLine(line);
                    return line.elem;
                });
            } else if (this.selected.line) {
                this.delLine(this.selected.line);
                deleteLines = [this.selected.line.elem];
            }
            this.operationGroup.clearOperation();
            return deleteLines;
        }
        return [];
    }

    public onMouseDown(target: SVGPathElement | SVGRectElement) {
        const [x, y] = this.cursorPosition;

        if (this.mode === Mode.DRAW) {
            // const attachPoint = this.cursorGroup.querySelector('#attachPoint');

            this.operationGroup.setEndPoint(x, y);
            this.cursorGroup.keyDown();
            return;
        }
        if (this.mode === Mode.SELECT) {
            this.selected.line && this.selected.line.elem.setAttribute('stroke', 'black');
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
                this.selected.point = null;
                this.beforeTransform = this.recordTransform();
                return;
            }
            // this.selected.line && this.selected.line.elem.setAttribute('stroke', 'black');
            this.selected.line = null;
            this.selected.point = null;
            this.selected.pointIndex = null;
        }
        this.operationGroup.clearOperation();
    }

    public onMouseUp() {
        if (this.mode === Mode.DRAW) {
            if (this.cursorGroup.isClosedLoop()) {
                this.operationGroup.isClosedLoop();
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
                this.queryLink(this.selected.line.elem).forEach(item => item.line.updatePosition());

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

    private attachCursor(x: number, y: number): { x: number, y: number, attached: boolean } {
        this.setGuideLineVisibility(false);

        let min: number = attachSpace;
        let attachPosition: Point;
        let guideX: Point;
        let guideY: Point;
        this.drawedLine.forEach((line) => {
            const selfIndex = line.EndPointsEle.findIndex(elem => elem === this.selected.point);
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
                            attachPosition = p;
                            min = Math.min(Math.abs(x - p[0]), Math.abs(y - p[1]));
                        }
                    }
                }
            });
        });
        if (attachPosition) {
            return { x: attachPosition[0], y: attachPosition[1], attached: true };
        }

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

                return { x: guideX[0], y: guideY[1], attached: false };
            }
            if (guideX) {
                this.guideX.setAttribute('visibility', 'visible');
                this.guideX.setAttribute('x1', guideX[0].toString());
                this.guideX.setAttribute('y1', y.toString());
                this.guideX.setAttribute('x2', guideX[0].toString());
                this.guideX.setAttribute('y2', guideX[1].toString());
                return { x: guideX[0], y, attached: false };
            }
            if (guideY) {
                this.guideY.setAttribute('visibility', 'visible');
                this.guideY.setAttribute('x1', x.toString());
                this.guideY.setAttribute('y1', guideY[1].toString());
                this.guideY.setAttribute('x2', guideY[0].toString());
                this.guideY.setAttribute('y2', guideY[1].toString());
                return { x, y: guideY[1], attached: false };
            }
        }
        return { x, y, attached: false };
    }

    private transformOperatingPoint([x, y]) {
        this.hasTransform = true;
        if (typeof this.selected.pointIndex === 'number') {
            this.selected.line.points[this.selected.pointIndex][0] = x;
            this.selected.line.points[this.selected.pointIndex][1] = y;
            this.selected.line.updatePosition(this.selected.line.points);
        } else {
            this.drawedLine.forEach((p) => {
                const index = p.EndPointsEle.findIndex(elem => elem === this.selected.point);

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
            if (item.elem === line) {
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

        this.queryLink(this.selected.line.elem).forEach(item => {
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

        const { x, y, attached } = this.attachCursor(cx, cy);
        if (attached) {
            this.cursorGroup.setAttachPoint(x, y);
        } else {
            this.cursorGroup.setAttachPoint();
        }
        this.cursorGroup.update(leftKeyPressed, x, y);
        this.cursorPosition = [x, y];

        if (leftKeyPressed) {
            this.updateSelectPoint();
        }

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
                this.operationGroup.updateOperation(this.selected.line.elem);
                return;
            }
            // move line
            if (leftKeyPressed && this.selected.line) {
                this.transformLine(dx, dy);
                this.operationGroup.updateOperation(this.selected.line.elem);
            }
        }
    }

    private generatePath() {
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

    private drawComplete() {
        if (this.mode !== Mode.DRAW) {
            return null;
        }
        this.setMode(Mode.NONE);

        const d = this.generatePath();
        if (d) {
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
        return null;
    }

    private transformComplete() {
        if (this.mode !== Mode.SELECT) {
            return;
        }
        this.setMode(Mode.NONE);

        this.originGraph.setAttribute('visibility', 'visible');
        const beforeGraphTransform = this.originGraph.getAttribute('d');
        const d = this.generatePath();
        if (d) {
            this.originGraph.setAttribute('d', d);
            this.originGraph.setAttribute('source', d);
            this.graph.remove();

            const { x, y, width, height } = this.originGraph.getBBox();
            this.originGraph.setAttribute('x', (x + width / 2).toString());
            this.originGraph.setAttribute('y', (y + height / 2).toString());

            if (this.onDrawTransformComplete) {
                this.onDrawTransformComplete({
                    target: this.originGraph,
                    before: beforeGraphTransform,
                    after: d
                });
            }
        }
    }

    public stopDraw(forcedStop = false) {
        if (forcedStop) {
            if (this.mode === Mode.SELECT) {
                this.originGraph.setAttribute('visibility', 'visible');
            }
            this.mode = Mode.NONE;
            // this.toogleVisible(false);
            this.operationGroup.clearOperation();
            this.clearAllEndPoint();
            this.originGraph = null;
            if (this.graph) {
                this.graph.remove();
                this.graph = null;
            }
        } else {
            if (this.mode === Mode.DRAW) {
                this.drawComplete();
            } else if (this.mode === Mode.SELECT) {
                this.transformComplete();
            }
        }
        this.cursorGroup.toogleVisible(false);
        this.setGuideLineVisibility(false);
        this.operationGroup.clearOperation();
        this.clearAllEndPoint();
    }
}

export default DrawGroup;
