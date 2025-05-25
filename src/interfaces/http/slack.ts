import express, { Request, Response } from 'express';
import { HandleOAuthUseCase } from '../../usecases/handle-oauth-usercase.js';
import { SlackRequestVerifierAdapter } from '../../infrastructure/adapters/slack-request-verifier.js';

export function createSlackRouter(
  handleOAuth: HandleOAuthUseCase,
  verifierAdapter: SlackRequestVerifierAdapter
) {
  const router = express.Router();

  router.get('/oauth_redirect', async (req: Request, res: Response) => {
    const code = req.query.code as string;
    await handleOAuth.execute(code);
    res.redirect('/success');
  });

  router.get('/onboard', async (req, res) => {
    // form html page to onboard
    res.send(`
      <html>
        <body>
          <h1>Onboarding</h1>
        </body>
      </html>
    `);
  })

  router.post('/onboard', express.urlencoded({extended:true}), async (req, res) => {
    const { teamId, plan, llmEndpoint } = req.body;
    // ToDo save to db by plan and llm, payment method, etc.
    res.json({
      ok: true,
      message: 'success onboarding',
    });
  })

  router.post('/events', async (req, res) => {
    await verifierAdapter.verify(req);
    res.sendStatus(200);
  })

  router.post('/commands', async (req, res) => {
    await verifierAdapter.verify(req);
    res.sendStatus(200);
  })

  return router;
}
