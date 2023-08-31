import { Request, Response, NextFunction } from 'express';
import { RoutesInput } from '@/types/types'
import structure from './structure.route'

export default ({ app }: RoutesInput) => {
    app.use(async function (req: Request, res: Response, next: NextFunction): Promise<void| Response> {
        try {
            const apiKey = req.headers['x-api-key'] as string;
            if (!apiKey) {
                return res.status(401).json({message: 'Invalid API key'});
            }

            const resFetch = await fetch(`${process.env.URL_PROJECT_SERVICE}/api/projects?token=${apiKey}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const {projects} = await resFetch.json();

            const {userId, id} = projects[0];

            res.locals.userId = userId;
            res.locals.projectId = id;

            next();
        } catch(err) {
            next(err);
        }
    });

    app.use('/api/structures', structure);
};