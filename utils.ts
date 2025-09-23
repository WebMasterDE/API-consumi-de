import { Express } from 'express';


export function listRoutes(app: Express) {
    const routes: any = [];
    app._router.stack.forEach((middleware: any) => {
        if (middleware.route) { // routes registered directly on the app
            routes.push(extractRoute(middleware));
        } else if (middleware.name === 'router') { // router middleware
            middleware.handle.stack.forEach((handler: any) => {
                if (handler.route) {
                    routes.push(extractRoute(handler));
                }
            });
        }
    });
    return routes;
}

export function extractRoute(middleware: any) {
    return {
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods).map(method => method.toUpperCase())
    };
}