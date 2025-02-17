# Setup

How to make your commits signed

Follow
https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits

Istall GPG suite

Create a new key and add it for your email (madsbak@outlook.com)
Save the password to the key

Export the public key, and upload it to github


Ensure all commits are signed
```bash
git config --global commit.gpgsign true
```

Set your GPG key
```bash
git config --global user.signingkey 660BEF7851EA95F6
```

Then start signing your commits, and check on github if you have the 'verified' status for your commits



