interface IPage {
    $name: string;
    $path: string;
    $rootPath: string;
    $src: string;
    $content: string;
    $summary: string;
    $pages: IPage[];
    $view?: string;
    $enabled: boolean;
}