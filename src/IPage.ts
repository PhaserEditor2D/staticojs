interface IPage {
    $name: string;
    $path: string;
    $src: string;
    $content: string;
    $summary: string;
    $pages: IPage[];
    $parent?: IPage;
    $view?: string;
}