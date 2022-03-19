import { createSVGElement } from '../../element-utils';
import { pointRadius, pointSize, ThemeColor } from './constants';
import { Point } from './Point';

class Line {
    public points: Point[];

    public EndPoins: Point[];

    public EndPointsEle: SVGRectElement[] = [];

    public elem: SVGPathElement;

    private scale: number;

    constructor(data: Point[] | SVGPathElement, scale: number) {
        this.scale = scale;

        if (data instanceof SVGPathElement) {
            this.elem = data;
            this.points = this.parsePoints();
        } else {
            const path = this.generatePath(data);
            const line = createSVGElement({
                element: 'path',
                attr: {
                    'stroke-width': 1 / this.scale,
                    d: path,
                    fill: 'transparent',
                    stroke: 'black'
                }
            }) as SVGPathElement;
            this.elem = line;
            this.points = data;
        }
        this.EndPoins = [
            this.points[0],
            this.points[this.points.length - 1]
        ];
        this.generateEndPointEle();
    }

    public updatePosition(points?: Point[]) {
        if (points) {
            this.elem.setAttribute('d', this.generatePath(points));
        }
        this.updateEndPointEle(points);
    }

    private parsePoints() {
        const d = this.elem.getAttribute('d');
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
    }

    private updateEndPointEle(point?: Point[]) {
        if (point) {
            const EndPoins = point ? [
                point[0],
                point[point.length - 1]
            ] : this.EndPoins;

            EndPoins.forEach((item, index) => {
                this.EndPointsEle[index].setAttribute('x', (item[0] - pointRadius / this.scale).toString());
                this.EndPointsEle[index].setAttribute('y', (item[1] - pointRadius / this.scale).toString());
            });
        } else {
            const points = this.parsePoints();
            this.points = points;
            this.EndPoins = [
                this.points[0],
                this.points[this.points.length - 1]
            ];
        }
    }

    public generatePath(points: Point[]) {
        const length = points.length;
        switch (length) {
            case 2:
                return `M ${points[0].join(' ')} L ${points[1].join(' ')} Z`;
            case 3:
                return `M ${points[0].join(' ')} Q ${points[1].join(' ')}, ${points[2].join(' ')}`;
            case 4:
                return `M ${points[0].join(' ')} C ${points[1].join(' ')}, ${points[2].join(' ')}, ${points[3].join(' ')}`;
            default:
                return '';
        }
    }

    public generateEndPointEle() {
        const pointRadiusWithScale = pointRadius / this.scale;
        this.EndPoins.forEach((item) => {
            const circle = Array.from(document.querySelectorAll<SVGRectElement>('rect[type="end-point"]')).find(elem => {
                return elem.getAttribute('x') === (item[0] - pointRadiusWithScale).toString() && elem.getAttribute('y') === (item[1] - pointRadiusWithScale).toString();
            }) || createSVGElement({
                element: 'rect',
                attr: {
                    type: 'end-point',
                    fill: '',
                    'fill-opacity': 1,
                    rx: pointRadiusWithScale.toString(),
                    ry: pointRadiusWithScale.toString(),
                    width: pointSize / this.scale,
                    height: pointSize / this.scale,
                    x: item[0] - pointRadiusWithScale,
                    y: item[1] - pointRadiusWithScale,
                    stroke: ThemeColor,
                    'stroke-width': 1 / this.scale,
                    'pointer-events': 'all'
                }
            });
            this.EndPointsEle.push(circle);
        });
    }

    private calcSymmetryPoint([x, y]: Point, [x1, y1]: Point): Point {
        return [2 * x1 - x, 2 * y1 - y];
    }

    public redrawCurve(x: number, y: number) {
        let points: Point[];
        if (this.points.length === 2) {
            const p = this.calcSymmetryPoint([x, y], this.points[1]);
            points = [this.points[0], p, this.points[1]];
        } else {
            const p = this.calcSymmetryPoint([x, y], this.points[2]);
            points = [this.points[0], this.points[1], p, this.points[2]];
        }
        const path = this.generatePath(points);
        this.elem.setAttribute('d', path);
    }

    public del() {
        this.elem.remove();
    }

    public updateScale(scale: number) {
        this.scale = scale;

        this.elem.setAttribute('stroke-width', (1 / this.scale).toString());

        const pointRadiusWithScale = pointRadius / this.scale;
        this.EndPointsEle.forEach((elem, index) => {
            const item = this.EndPoins[index];

            elem.setAttribute('width', (pointSize / this.scale).toString());
            elem.setAttribute('height', (pointSize / this.scale).toString());
            elem.setAttribute('rx', pointRadiusWithScale.toString());
            elem.setAttribute('ry', pointRadiusWithScale.toString());
            elem.setAttribute('x', (item[0] - pointRadiusWithScale).toString());
            elem.setAttribute('y', (item[1] - pointRadiusWithScale).toString());
            elem.setAttribute('stroke-width', (1 / scale).toString());
        });
    }
}

export default Line;
