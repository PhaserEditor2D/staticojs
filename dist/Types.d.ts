interface IConfig {
    title: string;
    theme: string;
    language: string;
}
interface IPage {
    $name: string;
    $path: string;
    $src: string;
    $content: string;
    $summary: string;
    $children: IPage[];
    $view?: string;
}
