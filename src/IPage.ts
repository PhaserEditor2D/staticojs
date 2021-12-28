interface IPage {
    $name: string;
    $path: string;
    $src: string;
    $content: string;
    $summary: string;
    $pages: IPage[];
    $view?: string
}