import { createSVGElement } from '../../element-utils';
import { pointRadius, pointSize, ThemeColor } from './constants';
import { Point } from './Point';

class Line {
    public points: Point[]

    public EndPoins: Point[]

    public EndPointsEle: SVGRectElement[] = []

    public elem: SVGPathElement

    constructor(elem) {
        this.elem = elem;

        const points = this.parsePoints();
        this.points = points;
        this.EndPoins = [
            this.points[0],
            this.points[this.points.length - 1]
        ];
        this.generateEndPointEle();
    }

    public updatePosition(points?: Point[]) {
        points && this.elem.setAttribute('d', points.length === 2 ? `M ${points[0].join(' ')} L ${points[1].join(' ')} Z` : `M ${points[0].join(' ')} Q ${points[1].join(' ')}, ${points[2].join(' ')}`);
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
                this.EndPointsEle[index].setAttribute('x', (item[0] - pointRadius).toString());
                this.EndPointsEle[index].setAttribute('y', (item[1] - pointRadius).toString());
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

    public generateEndPointEle() {
        this.EndPoins.forEach((item) => {
            const circle = Array.from(document.querySelectorAll<SVGRectElement>('rect[type="end-point"]')).find(elem => {
                return elem.getAttribute('x') === (item[0] - pointRadius).toString() && elem.getAttribute('y') === (item[1] - pointRadius).toString();
            }) || createSVGElement({
                element: 'rect',
                attr: {
                    type: 'end-point',
                    fill: '',
                    'fill-opacity': 1,
                    rx: pointRadius.toString(),
                    ry: pointRadius.toString(),
                    width: pointSize,
                    height: pointSize,
                    x: item[0] - pointRadius,
                    y: item[1] - pointRadius,
                    stroke: ThemeColor,
                    'pointer-events': 'all'
                }
            });
            this.EndPointsEle.push(circle);
        });
    }

    public del() {
        this.elem.remove();
    }
}

export default Line;
